<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// Definimos lo que recibe el componente
const props = defineProps<{
  modelValue: number | string | null; // El valor seleccionado (ID)
  options: any[];                     // La lista de ejercicios
  label: string;                      // Qué campo mostrar (ej: 'Nom')
  reduce: (option: any) => any;       // Función para sacar el ID del objeto
  placeholder?: string;
}>();

// Definimos lo que emite el componente
const emit = defineEmits(['update:modelValue']);

const searchText = ref('');
const showDropdown = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

// Filtrar las opciones basado en lo que escribe el usuario
const filteredOptions = computed(() => {
  const term = searchText.value.toLowerCase().trim();
  if (!term) return props.options;
  
  return props.options.filter(option => {
    const text = String(option[props.label]).toLowerCase();
    return text.includes(term);
  });
});

// Cuando cambia el valor externo (v-model), actualizamos el texto del input
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    // Si se limpia el valor, limpiamos el texto solo si no estamos escribiendo
    return;
  }
  
  // Buscamos el objeto completo para mostrar su nombre
  const selectedOption = props.options.find(opt => props.reduce(opt) === newValue);
  if (selectedOption) {
    searchText.value = selectedOption[props.label];
  }
}, { immediate: true });

// Seleccionar una opción de la lista
const selectOption = (option: any) => {
  const value = props.reduce(option);
  emit('update:modelValue', value); // Actualizamos el padre
  searchText.value = option[props.label]; // Ponemos el nombre bonito
  showDropdown.value = false;
};

// Manejar el foco y blur
const onFocus = () => {
  showDropdown.value = true;
  // CAMBIO PRINCIPAL: Borramos el texto inmediatamente al hacer foco
  searchText.value = ''; 
};

const onBlur = () => {
  // Retraso para permitir que el click en la lista ocurra antes de cerrar
  setTimeout(() => {
    showDropdown.value = false;
    
    // Lógica de restauración:
    // Si el usuario se va sin seleccionar nada nuevo, volvemos a poner el nombre del ejercicio que ya estaba guardado.
    const selectedOption = props.options.find(opt => props.reduce(opt) === props.modelValue);
    if (selectedOption) {
      searchText.value = selectedOption[props.label];
    } else if (!props.modelValue) {
      searchText.value = '';
    }
  }, 200);
};
</script>

<template>
  <div class="custom-select-container">
    <input 
      ref="inputRef"
      type="text" 
      class="form-control search-input"
      v-model="searchText"
      @focus="onFocus"
      @blur="onBlur"
      :placeholder="placeholder || 'Buscar...'"
    />
    
    <div class="search-dropdown" v-if="showDropdown">
      <ul v-if="filteredOptions.length > 0">
        <li 
          v-for="(option, index) in filteredOptions" 
          :key="index"
          @mousedown.prevent="selectOption(option)"
          :class="{ 'selected': reduce(option) === modelValue }"
        >
          {{ option[label] }}
        </li>
      </ul>
      <div v-else class="no-results">
        No se encontraron resultados
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-select-container {
  position: relative;
  width: 100%;
  flex: 1;
  min-width: 0;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  min-height: var(--touch-min);
  padding: 0 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--n4);
  background-color: var(--n1);
  color: var(--n8);
  font-family: var(--font-sans);
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--led-amber);
}

.search-input:focus-visible {
  outline: 2px solid var(--led-amber);
  outline-offset: 1px;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--n1);
  border: 1px solid var(--n4);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: var(--shadow-lg);
}

.search-dropdown ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-dropdown li {
  display: flex;
  align-items: center;
  min-height: var(--touch-min);
  padding: 0 0.85rem;
  cursor: pointer;
  border-bottom: 1px solid var(--n3);
  color: var(--n8);
}

.search-dropdown li:last-child {
  border-bottom: none;
}

.search-dropdown li:hover {
  background-color: var(--n3);
}

.search-dropdown li.selected {
  background-color: var(--led-amber-dim);
  font-weight: 600;
  color: var(--led-amber);
}

.no-results {
  padding: 1rem;
  color: var(--n6);
  text-align: center;
}
</style>