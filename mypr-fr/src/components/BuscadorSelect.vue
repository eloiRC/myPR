<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';

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
  flex: 1; /* Para que ocupe espacio si está en flex */
  min-width: 0;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  /* Hereda estilos de tu .form-control global, pero aseguramos estos: */
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border, #ccc);
  background-color: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-cobalt-blue, #0047AB);
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--bg-primary, #fff);
  border: 1px solid var(--border, #ccc);
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.search-dropdown ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-dropdown li {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border, #eee);
  color: var(--text-primary, #333);
  transition: background-color 0.1s;
}

.search-dropdown li:last-child {
  border-bottom: none;
}

.search-dropdown li:hover {
  background-color: var(--color-cobalt-blue, #0047AB);
  color: white;
}

.search-dropdown li.selected {
  background-color: rgba(25, 86, 200, 0.1);
  font-weight: 600;
  color: var(--color-cobalt-blue, #0047AB);
}

.no-results {
  padding: 1rem;
  color: var(--text-secondary, #888);
  text-align: center;
  font-style: italic;
}
</style>