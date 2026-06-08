#!/usr/bin/env python3
"""
Daily Garmin Connect sync script.
Fetches recovery metrics and cardio activities for all configured users
and pushes them to the myPR API.

Environment variables:
  MYPR_API_URL       - Worker URL (e.g. https://mypr.workers.dev)
  MYPR_API_KEY       - Shared API key for auth
"""

import os
import sys
import json
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from garminconnect import Garmin


API_URL = os.environ["MYPR_API_URL"].rstrip("/")
API_KEY = os.environ["MYPR_API_KEY"]
HEADERS = {"X-Garmin-API-Key": API_KEY, "Content-Type": "application/json"}
TIMEOUT = 60


def log(msg: str):
    print(f"[{datetime.now().isoformat()}] {msg}", flush=True)


def api_get(path: str) -> Any:
    resp = requests.get(f"{API_URL}{path}", headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def api_post(path: str, data: dict) -> dict:
    resp = requests.post(f"{API_URL}{path}", json=data, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def parse_garmin_datetime(dt_str: str) -> int:
    """Convert Garmin datetime string like '2026-05-25 10:30:00' to unix timestamp."""
    dt = datetime.strptime(dt_str.split(".")[0], "%Y-%m-%d %H:%M:%S")
    return int(dt.replace(tzinfo=timezone.utc).timestamp())


def to_unix(date_str: str) -> int:
    """Convert 'YYYY-MM-DD' to start-of-day unix timestamp."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return int(dt.replace(tzinfo=timezone.utc).timestamp())


def safe_fetch(fn, *args, **kwargs):
    """Wrap a garminconnect API call and return (value, error_str)."""
    try:
        return fn(*args, **kwargs), None
    except Exception as e:
        return None, str(e)


def sync_user(client: Garmin, user_id: int, yesterday: str, yesterday_ts: int):
    """Fetch and push recovery + activity data for one user."""
    log(f"  [{user_id}] Fetching Garmin data for {yesterday}...")

    # --- Sleep ---
    sleep_hours = sleep_score = sleep_deep = sleep_light = sleep_rem = None
    sleep_data, err = safe_fetch(client.get_sleep_data, yesterday)
    if err:
        log(f"  [{user_id}] Sleep fetch failed: {err}")
    elif sleep_data and sleep_data.get("dailySleepDTO"):
        dto = sleep_data["dailySleepDTO"]
        total_sec = dto.get("sleepTimeFactors", {}).get("totalSleepTime", 0)
        if total_sec:
            sleep_hours = round(total_sec / 3600, 2)
        sleep_score = dto.get("sleepScores", {}).get("overall", {}).get("value")
        sleep_deep = round(dto.get("deepSleepSeconds", 0) / 3600, 2) if dto.get("deepSleepSeconds") else 0
        sleep_light = round(dto.get("lightSleepSeconds", 0) / 3600, 2) if dto.get("lightSleepSeconds") else 0
        sleep_rem = round(dto.get("remSleepSeconds", 0) / 3600, 2) if dto.get("remSleepSeconds") else 0

    # --- HRV ---
    hrv = hrv_last_night = None
    hrv_data, err = safe_fetch(client.get_hrv_data, yesterday)
    if err:
        log(f"  [{user_id}] HRV fetch failed: {err}")
    elif hrv_data and isinstance(hrv_data, dict):
        summary = hrv_data.get("hrvSummary", {})
        hrv = summary.get("weeklyAvg")
        hrv_last_night = summary.get("lastNightAvg")

    # --- Body Battery ---
    bb = bb_drained = None
    bb_data, err = safe_fetch(client.get_body_battery, yesterday, yesterday)
    if err:
        log(f"  [{user_id}] Body battery fetch failed: {err}")
    elif bb_data and isinstance(bb_data, list):
        for entry in bb_data:
            if entry.get("charged"):
                bb = entry.get("charged")
            if entry.get("drained"):
                bb_drained = entry.get("drained")

    # --- Stress ---
    stress = None
    stress_data, err = safe_fetch(client.get_stress_data, yesterday)
    if err:
        log(f"  [{user_id}] Stress fetch failed: {err}")
    elif stress_data and isinstance(stress_data, dict):
        stress = stress_data.get("overallStressLevel")

    # --- Stats (steps, resting HR, calories) ---
    steps = resting_hr = calories = active_calories = None
    stats, err = safe_fetch(client.get_stats, yesterday)
    if err:
        log(f"  [{user_id}] Stats fetch failed: {err}")
    elif stats and isinstance(stats, dict):
        steps = stats.get("totalSteps")
        resting_hr = stats.get("restingHeartRate")
        calories = stats.get("totalKilocalories")
        active_calories = stats.get("activeKilocalories")

    # --- Heart Rates (max, min) ---
    max_hr = min_hr = None
    hr_data, err = safe_fetch(client.get_heart_rates, yesterday)
    if err:
        log(f"  [{user_id}] Heart rates fetch failed: {err}")
    elif hr_data and isinstance(hr_data, dict):
        max_hr = hr_data.get("maxHeartRate")
        min_hr = hr_data.get("minHeartRate")

    # --- Training Readiness ---
    training_readiness = None
    tr_data, err = safe_fetch(client.get_training_readiness, yesterday)
    if err:
        pass  # many accounts don't have this
    elif tr_data and isinstance(tr_data, dict):
        training_readiness = (tr_data.get("trainingReadiness") or
                              tr_data.get("trainingReadinessScore") or
                              tr_data.get("readiness"))

    # --- Max Metrics (VO2 max) ---
    vo2_max = None
    max_metrics, err = safe_fetch(client.get_max_metrics, yesterday)
    if err:
        pass
    elif max_metrics and isinstance(max_metrics, dict):
        vo2_max = max_metrics.get("vo2Max")

    # --- Respiration ---
    respiration = None
    resp_data, err = safe_fetch(client.get_respiration_data, yesterday)
    if err:
        pass
    elif resp_data and isinstance(resp_data, dict):
        respiration = resp_data.get("avgRespiration")

    # --- SpO2 ---
    spo2 = None
    spo2_data, err = safe_fetch(client.get_spo2_data, yesterday)
    if err:
        pass
    elif spo2_data and isinstance(spo2_data, dict):
        spo2 = spo2_data.get("avgSpO2")

    # --- Intensity Minutes ---
    intensity_minutes = None
    im_data, err = safe_fetch(client.get_intensity_minutes_data, yesterday)
    if err:
        pass
    elif im_data and isinstance(im_data, dict):
        intensity_minutes = (im_data.get("intensityMinutes") or
                             im_data.get("activeMinutes") or
                             im_data.get("weeklyIntensityMinutes"))

    recovery_payload = {
        "userId": user_id,
        "data": yesterday_ts,
        "sleepHores": sleep_hours,
        "sleepScore": sleep_score,
        "sleepDeep": sleep_deep,
        "sleepLight": sleep_light,
        "sleepREM": sleep_rem,
        "hrv": hrv,
        "hrvLastNight": hrv_last_night,
        "restingHR": resting_hr,
        "passos": steps,
        "stress": stress,
        "bodyBattery": bb,
        "bodyBatteryDrained": bb_drained,
        "trainingReadiness": training_readiness,
        "calories": calories,
        "activeCalories": active_calories,
        "intensityMinutes": intensity_minutes,
        "maxHR": max_hr,
        "minHR": min_hr,
        "vo2Max": vo2_max,
        "respirationRate": respiration,
        "spo2": spo2,
    }
    non_null = {k: v for k, v in recovery_payload.items() if v is not None}
    log(f"  [{user_id}] Recovery: {json.dumps(non_null)}")

    try:
        api_post("/api/garmin/recovery", recovery_payload)
        log(f"  [{user_id}] Recovery data pushed OK")
    except Exception as e:
        log(f"  [{user_id}] Failed to push recovery: {e}")

    # --- Activities ---
    try:
        all_activities = client.get_activities(0, 20)
    except Exception as e:
        log(f"  [{user_id}] Activities fetch failed: {e}")
        all_activities = []

    for act in all_activities:
        start_local = act.get("startTimeLocal", "")
        if not start_local.startswith(yesterday):
            continue

        try:
            activity_type = act.get("activityType", {})
            tipus = activity_type.get("typeKey", str(activity_type.get("typeId", "unknown")))

            distance_m = act.get("distance", 0) or 0
            distancia = round(distance_m / 1000, 3) if distance_m else None

            activity_payload = {
                "userId": user_id,
                "garminActivityId": str(act.get("activityId", "")),
                "data": parse_garmin_datetime(start_local),
                "tipus": tipus,
                "nom": act.get("activityName", None),
                "distancia": distancia,
                "durada": act.get("duration", None),
                "avgHR": act.get("averageHeartRate") or act.get("avgHeartRate"),
                "maxHR": act.get("maxHeartRate", None),
                "avgSpeed": act.get("averageSpeed") or act.get("avgSpeed"),
                "maxSpeed": act.get("maxSpeed", None),
                "desnivelPos": act.get("elevationGain", None),
                "desnivelNeg": act.get("elevationLoss", None),
                "minElevation": act.get("minElevation", None),
                "maxElevation": act.get("maxElevation", None),
                "tss": act.get("trainingStressScore", None),
                "esforc": act.get("aerobicTrainingEffect", None),
                "anaerobicEsforc": act.get("anaerobicTrainingEffect", None),
                "calories": act.get("calories", None),
                "avgPower": act.get("averagePower") or act.get("avgPower"),
                "maxPower": act.get("maxPower", None),
                "vo2MaxValue": act.get("vO2MaxValue", None),
                "avgCadence": act.get("avgRunCadence") or act.get("averageCadence"),
                "avgStrideLength": act.get("avgStrideLength", None),
            }
            log(f"  [{user_id}] Activity: {tipus} - {activity_payload['nom'] or 'unnamed'}")
            api_post("/api/garmin/activity", activity_payload)
            log(f"  [{user_id}] Activity pushed OK")
        except Exception as e:
            log(f"  [{user_id}] Failed to push activity: {e}")

    # Mark sync complete
    try:
        api_post("/api/garmin/sync-complete", {"userId": user_id})
    except Exception as e:
        log(f"  [{user_id}] Failed to update sync timestamp: {e}")


def main():
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    yesterday_ts = to_unix(yesterday)
    log(f"Starting Garmin sync for {yesterday}")

    # Get users with Garmin credentials
    try:
        users = api_get("/api/garmin/users-sync")
    except Exception as e:
        log(f"Failed to fetch users: {e}")
        sys.exit(1)

    if not users:
        log("No users with Garmin credentials found")
        return

    log(f"Found {len(users)} user(s) to sync")

    for u in users:
        user_id = u["userId"]
        email = u.get("garminEmail", "?")
        password = u.get("garminPassword")

        if not email or not password:
            log(f"  [{user_id}] Skipping: missing credentials")
            continue

        log(f"  [{user_id}] Logging into Garmin as {email}...")
        try:
            client = Garmin(email, password)
            client.login()
            log(f"  [{user_id}] Login OK")
        except Exception as e:
            log(f"  [{user_id}] Login failed: {e}")
            traceback.print_exc()
            continue

        sync_user(client, user_id, yesterday, yesterday_ts)

    log("Sync complete")


if __name__ == "__main__":
    main()
