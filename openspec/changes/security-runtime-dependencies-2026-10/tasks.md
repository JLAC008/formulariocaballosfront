# Tasks

## 1. Corrección local

- [x] 1.1 Registrar dependencias y avisos anteriores, diferenciando herramientas y runtime.
- [x] 1.2 Aplicar actualizaciones compatibles y fijar runtime Node con parche de seguridad.
- [x] 1.3 Repetir auditoría, compilación y comprobaciones pertinentes sin producción.
- [x] 1.4 Revisar el diff de forma independiente y documentar limitaciones.
- [x] 1.5 Añadir `webpack-dev-middleware@7.4.5` por override compatible; validar runtime separado sin vulnerabilidades.
- [x] 1.6 Build de producción y smoke HTTP local del shell y bundle; confirmar que no existe target ni archivos de tests unitarios.

## 2. Publicación y despliegue

- [x] 2.1 Con autorización del usuario, verificar `origin/master`, publicar y comprobar commit y salud en Dokploy.
- [ ] 2.2 Confirmar el deployment y el dominio público en Dokploy.
