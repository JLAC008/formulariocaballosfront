# Design

## Context

Auditoría npm actual y boletín Node del 21 de octubre: 22.23.4 corrige vulnerabilidades del runtime. El runtime realmente desplegado sigue pendiente de comprobar en Dokploy.

## Goals / Non-Goals

Reducir vulnerabilidades aplicables y conservar comportamiento. No cambiar APIs, esquema ni datos.

## Decisions

Actualizar Angular core/compiler/CLI/build de forma coherente y fijar Node 22.23.4 con Alpine. El contenedor final solo lleva el bundle estático y `serve@14.2.6`; el lockfile del servidor fija `compression@1.8.2`. En Angular 20 se fuerza `webpack-dev-middleware@7.4.5`, compatible con la rama 7.4 declarada por el builder. No usar `npm audit fix --force` ni saltar a Angular 21 solo para silenciar avisos.

## Risks / Trade-offs

La auditoría completa mantiene 8 altas y 2 moderadas en el toolchain de Angular de build/desarrollo. La alta de `braces` no tiene versión corregida publicada; las demás pendientes llevan npm a recomendar Angular 21, fuera de la versión actual. `npm audit --omit=dev` y la auditoría del runtime `serve` dan cero vulnerabilidades. El target Angular no tiene configuración de pruebas ni archivos `*.spec.ts`; se valida con build de producción y smoke local del HTML y bundle JavaScript. La auditoría de manifiestos no demuestra explotación ni equivale a escaneo de imagen.

## Migration Plan

No hay base de datos ni migraciones para este frontend. Se verificó `origin/master` contra `docs/deployment.md`; el push dispara Auto Deploy de producción. Tras publicarlo, verificar commit, resultado de Dokploy y respuesta HTTP del dominio.
