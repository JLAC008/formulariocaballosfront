# Proposal

## Why

La auditoría del 2026-10-23 detecta dependencias con avisos publicados y runtimes Docker sin parche mínimo verificable. Se actualizan Angular, Node y el servidor estático de producción.

## What Changes

Actualizar Angular dentro de su major, corregir una dependencia vulnerable de webpack-dev-server y fijar Node 22.23.4. Sustituir la instalación global de `serve` por un servidor estático de producción con lockfile propio. Mantener los contratos existentes y documentar avisos restantes del toolchain.

## Capabilities

Sin cambios funcionales intencionados; skip_specs: true por mantenimiento de dependencias.

## Impact

package.json, package-lock.json y Dockerfile. Sin cambios de esquema PostgreSQL, variables ni topología Compose. La rama `master` de producción tiene Auto Deploy. El usuario autorizó publicación secuencial; verificar cada despliegue antes de continuar.
