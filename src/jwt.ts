/**
 * Genera un token JWT usando WebCrypto API
 * @param payload - Datos a incluir en el token
 * @param secret - Clave secreta para firmar el token
 * @returns Token JWT completo
 */
async function generateJWT(payload: any, secret: string): Promise<string> {
    // Crear el encabezado (header)
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    // Función helper para codificar en base64url
    const base64urlEncode = (str: string): string => {
        return btoa(str)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    // Convertir header y payload a base64url
    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(payload));

    // Concatenar header y payload
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    // Preparar para firmar
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToSign);
    const keyData = encoder.encode(secret);

    // Importar la clave secreta
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Generar la firma
    const signature = await crypto.subtle.sign(
        { name: 'HMAC', hash: 'SHA-256' },
        key,
        data
    );

    // Convertir la firma a base64url
    const binarySignature = String.fromCharCode(...new Uint8Array(signature));
    const signatureBase64 = base64urlEncode(binarySignature);

    // Retornar el token JWT completo
    return `${encodedHeader}.${encodedPayload}.${signatureBase64}`;
}

/**
 * Verifica un token JWT y devuelve el payload si es válido
 * @param token - Token JWT a verificar
 * @param secret - Clave secreta para verificar la firma
 * @returns Payload decodificado si el token es válido
 * @throws Error si el token no es válido o ha expirado
 */
async function verifyJWT(token: string, secret: string): Promise<any> {
    // Dividir el token en sus partes
    const parts = token.split('.');

    if (parts.length !== 3) {
        throw new Error('Token JWT malformado');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Función helper para decodificar base64url
    const base64urlDecode = (str: string): string => {
        // Añadir padding si es necesario
        const padding = '='.repeat((4 - str.length % 4) % 4);
        const base64 = str
            .replace(/-/g, '+')
            .replace(/_/g, '/') + padding;

        return atob(base64);
    };

    // Concatenar header y payload para verificar
    const dataToVerify = `${headerB64}.${payloadB64}`;

    // Preparar para verificar la firma
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToVerify);
    const keyData = encoder.encode(secret);

    // Importar la clave secreta
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );

    // Decodificar la firma
    const signatureRaw = base64urlDecode(signatureB64);
    const signature = new Uint8Array(signatureRaw.length);

    for (let i = 0; i < signatureRaw.length; i++) {
        signature[i] = signatureRaw.charCodeAt(i);
    }

    // Verificar la firma
    const isValid = await crypto.subtle.verify(
        { name: 'HMAC', hash: 'SHA-256' },
        key,
        signature,
        data
    );

    if (!isValid) {
        throw new Error('Firma JWT inválida');
    }

    // Decodificar el payload
    const payloadStr = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadStr);

    // Verificar la expiración
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTimestamp) {
        throw new Error('Token JWT expirado');
    }

    return payload;
}

// Funciones para encriptar y verificar contraseñas
async function hashPassword(password: string): Promise<string> {
    // Convertir la contraseña a un ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Generar un salt aleatorio
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derivar una clave usando PBKDF2
    const key = await crypto.subtle.importKey(
        'raw',
        data,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const hash = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt.buffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        key,
        256
    );

    // Combinar salt y hash para almacenamiento
    const hashArray = new Uint8Array(hash);
    const result = new Uint8Array(salt.length + hashArray.length);
    result.set(salt);
    result.set(hashArray, salt.length);

    // Convertir a base64 para almacenamiento
    return btoa(String.fromCharCode(...result));
}

async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
    try {
        // Decodificar el hash almacenado
        const hashData = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));

        // Extraer salt (primeros 16 bytes)
        const salt = hashData.slice(0, 16);
        const originalHash = hashData.slice(16);

        // Convertir la contraseña a verificar
        const encoder = new TextEncoder();
        const data = encoder.encode(password);

        // Importar la clave
        const key = await crypto.subtle.importKey(
            'raw',
            data,
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        // Derivar bits con el mismo salt
        const verifyHash = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt.buffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            key,
            256
        );

        // Comparar los hashes
        const verifyHashArray = new Uint8Array(verifyHash);

        if (originalHash.length !== verifyHashArray.length) {
            return false;
        }

        // Comparación segura contra timing attacks
        let result = 0;
        for (let i = 0; i < originalHash.length; i++) {
            result |= originalHash[i] ^ verifyHashArray[i];
        }

        return result === 0;
    } catch (error) {
        console.error('Error al verificar la contraseña:', error);
        return false;
    }
}

export { generateJWT, verifyJWT, hashPassword, verifyPassword }