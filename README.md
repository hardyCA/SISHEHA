# Sistema de Gestión de Restaurante

Un sistema completo de gestión de restaurante desarrollado con HTML, CSS, JavaScript y Firebase, diseñado para uso personal sin necesidad de autenticación.

## 🚀 Características Principales

### 📊 Dashboard
- Vista general con estadísticas clave
- Ventas del día y ganancias
- Platos más vendidos
- Gráficos de rendimiento

### 🥕 Gestión de Ingredientes
- Registro de ingredientes con cantidad, precio y porciones
- Cálculo automático del costo unitario por porción
- Control de inventario restante
- Edición y eliminación de ingredientes

### 🍽️ Gestión de Platos
- Creación de platos con composición de ingredientes
- Cálculo automático de costos basado en ingredientes
- Cálculo de ganancia por plato
- Gestión completa de recetas

### 💰 Registro de Ventas
- Registro rápido de ventas diarias
- Cálculo automático de ganancias
- Historial de ventas por día
- Integración con control de inventario

### 📈 Reportes y Análisis
- Resumen diario de ventas y costos
- Análisis de inventario actual
- Reportes de costos por plato
- Estadísticas de rendimiento

### 💳 Control de Capital
- Gestión de capital inicial
- Registro de gastos de caja
- Historial completo de movimientos
- Cálculo automático de capital disponible

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Base de Datos**: Firebase Firestore
- **UI/UX**: Diseño moderno con gradientes y efectos glassmorphism
- **Iconos**: Font Awesome
- **Fuentes**: Google Fonts (Inter)

## 📋 Estructura del Proyecto

```
sistemates/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── app.js             # Lógica de la aplicación
└── README.md          # Documentación
```

## 🔧 Configuración

### 1. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita Firestore Database
4. Obtén la configuración de tu proyecto
5. Reemplaza la configuración en `index.html`:

```javascript
const firebaseConfig = {
    apiKey: "tu-api-key",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "tu-app-id"
};
```

### 2. Estructura de Base de Datos

El sistema creará automáticamente las siguientes colecciones en Firestore:

- **ingredients**: Ingredientes del restaurante
- **dishes**: Platos y sus composiciones
- **sales**: Registro de ventas
- **capital**: Historial de capital y gastos

## 🚀 Uso del Sistema

### Flujo de Trabajo Diario

1. **Agregar Capital Inicial**
   - Ve a la sección "Capital"
   - Agrega tu capital inicial

2. **Registrar Ingredientes**
   - Ve a "Ingredientes"
   - Agrega cada ingrediente con su cantidad, precio y porciones

3. **Crear Platos**
   - Ve a "Platos"
   - Define la composición de cada plato con sus ingredientes

4. **Registrar Ventas**
   - Ve a "Ventas"
   - Registra cada venta del día

5. **Generar Reportes**
   - Ve a "Reportes"
   - Revisa el resumen del día y análisis

### Ejemplo de Uso

#### Ingrediente: Pollo
- **Cantidad**: 2400g
- **Precio Total**: $15.00
- **Porciones**: 8
- **Costo por Porción**: $1.88

#### Plato: Pollo a la Plancha
- **Ingredientes**:
  - Pollo: 1 porción (300g)
  - Arroz: 0.5 porción
  - Papas: 0.3 porción
- **Costo Total**: $2.50
- **Precio de Venta**: $8.00
- **Ganancia**: $5.50

## 🎨 Características de Diseño

- **Diseño Moderno**: Interfaz con efectos glassmorphism y gradientes
- **Responsive**: Adaptable a dispositivos móviles y desktop
- **Intuitivo**: Navegación clara y fácil de usar
- **Animaciones**: Transiciones suaves y efectos visuales
- **Accesible**: Colores contrastantes y tipografía legible

## 📱 Responsive Design

El sistema está optimizado para:
- **Desktop**: Experiencia completa con sidebar
- **Tablet**: Adaptación de layouts
- **Mobile**: Navegación optimizada para pantallas pequeñas

## 🔒 Seguridad

- **Sin Autenticación**: Diseñado para uso personal
- **Datos Locales**: Toda la información se almacena en tu proyecto Firebase
- **Control Total**: Tú tienes control completo sobre tus datos

## 🚀 Despliegue

### Opción 1: Firebase Hosting (Recomendado)

1. Instala Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Inicializa el proyecto:
```bash
firebase init hosting
```

3. Despliega:
```bash
firebase deploy
```

### Opción 2: Servidor Local

1. Abre `index.html` en tu navegador
2. O usa un servidor local:
```bash
python -m http.server 8000
```

## 📊 Funcionalidades Avanzadas

### Cálculos Automáticos
- **Costo por Porción**: `Precio Total ÷ Porciones`
- **Costo del Plato**: Suma de costos de ingredientes
- **Ganancia**: `Precio de Venta - Costo del Plato`
- **Capital Actual**: Suma de ingresos menos gastos

### Reportes Inteligentes
- Análisis de platos más rentables
- Control de inventario en tiempo real
- Tendencias de ventas
- Optimización de costos

## 🛠️ Personalización

### Agregar Nuevas Unidades
Edita el archivo `index.html` en la sección de ingredientes:

```html
<select id="ingredient-unit" required>
    <option value="g">Gramos</option>
    <option value="kg">Kilogramos</option>
    <option value="l">Litros</option>
    <option value="ml">Mililitros</option>
    <option value="unidad">Unidades</option>
    <!-- Agrega tus unidades aquí -->
</select>
```

### Modificar Colores
Edita las variables CSS en `styles.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #56ab2f;
    --danger-color: #ff416c;
}
```

## 📞 Soporte

Este sistema está diseñado para ser autónomo y fácil de usar. Todas las funcionalidades están documentadas en el código y la interfaz es intuitiva.

## 📄 Licencia

Este proyecto es de uso libre para fines personales y educativos.

---

**¡Disfruta gestionando tu restaurante de manera eficiente! 🍽️✨**

