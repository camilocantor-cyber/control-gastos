# Sistema de Recuperación de Contraseña - BPM Manager

## 📋 Resumen

Se ha implementado un sistema completo de recuperación de contraseña integrado con Supabase para el proyecto BPM Manager. El sistema incluye un modal elegante y una página dedicada para restablecer la contraseña.

## 🎨 Componentes Creados

### 1. **PasswordResetModal.tsx**
Modal premium para solicitar el enlace de recuperación de contraseña.

**Características:**
- Diseño consistente con el componente Auth
- Animaciones suaves (fadeIn, slideUp, scaleIn)
- Validación de email
- Estado de éxito con auto-cierre
- Integración completa con Supabase

**Ubicación:** `src/components/PasswordResetModal.tsx`

### 2. **ResetPassword.tsx**
Página completa para restablecer la contraseña cuando el usuario hace clic en el enlace del correo.

**Características:**
- Validación de token de recuperación
- Validación de contraseñas (mínimo 6 caracteres, coincidencia)
- Estados: cargando, token inválido, formulario, éxito
- Redirección automática después del éxito
- Diseño premium con animaciones

**Ubicación:** `src/components/ResetPassword.tsx`

## 🔧 Modificaciones Realizadas

### 1. **useAuth.tsx** (Hook de Autenticación)
Se agregó el método `resetPassword` que utiliza la API de Supabase:

```typescript
async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message || null };
}
```

### 2. **Auth.tsx** (Componente de Autenticación)
- Importación del `PasswordResetModal`
- Nuevo estado `showResetModal`
- Botón "¿Olvidaste tu contraseña?" (solo visible en modo login con contraseña)
- Renderizado del modal

### 3. **App.tsx** (Componente Principal)
- Importación de `ResetPassword`
- Detección de URL con token de recuperación (`type=recovery`)
- Renderizado condicional de la página de restablecimiento

### 4. **index.css** (Estilos)
Se agregaron animaciones CSS:
- `fadeIn` - Aparición suave del modal
- `slideUp` - Deslizamiento hacia arriba
- `shake` - Sacudida para errores
- `scaleIn` - Escala para éxito

## 🔄 Flujo de Recuperación de Contraseña

### Paso 1: Solicitar Recuperación
1. Usuario hace clic en "¿Olvidaste tu contraseña?" en la pantalla de login
2. Se abre el `PasswordResetModal`
3. Usuario ingresa su email
4. Se envía solicitud a Supabase mediante `resetPassword(email)`
5. Supabase envía un correo con un enlace de recuperación

### Paso 2: Restablecer Contraseña
1. Usuario hace clic en el enlace del correo
2. El enlace contiene un token de recuperación en el hash (`#type=recovery&...`)
3. La aplicación detecta el hash y muestra `ResetPassword`
4. Usuario ingresa y confirma su nueva contraseña
5. Se actualiza la contraseña mediante `supabase.auth.updateUser()`
6. Redirección automática al login

## 🎯 Configuración de Supabase

Para que el sistema funcione correctamente, asegúrate de:

1. **Configurar Email Templates en Supabase:**
   - Ve a Authentication > Email Templates
   - Personaliza el template "Reset Password"
   - El enlace debe apuntar a: `{{ .SiteURL }}/reset-password`

2. **Configurar Site URL:**
   - Ve a Authentication > URL Configuration
   - Establece la Site URL (ej: `http://localhost:5173` para desarrollo)
   - Agrega la URL a Redirect URLs

3. **Variables de Entorno:**
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

## 🎨 Diseño y UX

### Características de Diseño:
- **Colores:** Gradientes azul-índigo consistentes con el sistema
- **Tipografía:** Fuentes bold y black para jerarquía visual
- **Animaciones:** Transiciones suaves y micro-interacciones
- **Feedback:** Estados claros (loading, error, success)
- **Responsivo:** Funciona en todos los tamaños de pantalla

### Estados del Modal:
1. **Formulario:** Input de email con validación
2. **Éxito:** Confirmación visual con auto-cierre en 3 segundos

### Estados de la Página:
1. **Cargando:** Spinner mientras valida el token
2. **Token Inválido:** Mensaje de error con botón para volver
3. **Formulario:** Inputs de contraseña con validación
4. **Éxito:** Confirmación con redirección automática

## 🔒 Seguridad

- **Tokens de un solo uso:** Supabase genera tokens únicos que expiran
- **Validación de contraseña:** Mínimo 6 caracteres
- **Confirmación de contraseña:** Previene errores de tipeo
- **HTTPS requerido:** En producción, Supabase requiere HTTPS

## 📝 Uso

### Para el Usuario:
1. En la pantalla de login, hacer clic en "¿Olvidaste tu contraseña?"
2. Ingresar email y hacer clic en "Enviar Enlace"
3. Revisar el correo electrónico
4. Hacer clic en el enlace del correo
5. Ingresar nueva contraseña dos veces
6. Hacer clic en "Restablecer Contraseña"
7. Esperar redirección automática al login

### Para el Desarrollador:
El sistema está completamente integrado. Solo necesitas:
- Tener Supabase configurado correctamente
- Las variables de entorno configuradas
- El servidor de desarrollo corriendo

## 🚀 Próximos Pasos (Opcional)

- [ ] Agregar validación de fortaleza de contraseña
- [ ] Implementar rate limiting para prevenir abuso
- [ ] Agregar opción de "Recordar este dispositivo"
- [ ] Implementar autenticación de dos factores (2FA)
- [ ] Agregar historial de cambios de contraseña

## 📦 Archivos Modificados/Creados

```
src/
├── components/
│   ├── PasswordResetModal.tsx    (NUEVO)
│   ├── ResetPassword.tsx          (NUEVO)
│   └── Auth.tsx                   (MODIFICADO)
├── hooks/
│   └── useAuth.tsx                (MODIFICADO)
├── App.tsx                        (MODIFICADO)
└── index.css                      (MODIFICADO)
```

## ✅ Testing

Para probar el sistema:

1. **Desarrollo Local:**
   ```bash
   npm run dev
   ```

2. **Probar Modal:**
   - Ir a login
   - Hacer clic en "¿Olvidaste tu contraseña?"
   - Ingresar un email válido registrado en Supabase

3. **Probar Página de Reset:**
   - Revisar el correo enviado por Supabase
   - Hacer clic en el enlace
   - Ingresar nueva contraseña

---

**Desarrollado para BPM Manager**  
Sistema de recuperación de contraseña integrado con Supabase
