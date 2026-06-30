# Módulos del Sistema

Este directorio contiene la lógica de negocio del sistema, organizada en **módulos independientes**. Cada módulo:

- Es **dueño absoluto** de su/s colección/es en Firebase
- Exporta una **API pública** limpia (`index.ts`)
- Tiene su propia **documentación de diagnóstico** (`README.md`)
- **No depende** de otros módulos de negocio (solo de `shared/`)
- Otros módulos pueden **leer** su API, pero nunca escribir en sus colecciones

## Mapa de módulos

```
                    ┌─────────────┐
                    │ Configuración│ ← Dueño de configuracion, CONSTANTES
                    └──────┬──────┘
                           │ getTipoFactura()
              ┌────────────┼────────────┬──────────────┐
              ▼            ▼            ▼              ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Clientes │ │Productos │ │Vendedores│ │ Vehículos │
        └────┬─────┘ └──────────┘ └──────────┘ └──────────┘
             │
             ▼  (lectura de datos)
    ┌────────────────┐
    │  Presupuestos   │ ← Dueño de presupuestos + contador
    └───────┬────────┘
            │ createRemitoFromPresupuesto()
            ▼
    ┌────────────────┐
    │RemitosAprobados │ ← Dueño de remitos_aprobados + contador
    └───────┬────────┘
            │ createFactura()
            ▼
    ┌────────────────┐
    │   Facturas      │ ← Dueño de facturas + contador + pagos
    └───────┬────────┘
            │ createSalida()
            ▼
    ┌────────────────┐
    │   Salidas       │ ← Dueño de salidas (sin contador)
    └────────────────┘

┌──────────────────┐
│ Legacy (remitos)  │ ← Solo lectura, en deprecación
└──────────────────┘
```

## Reglas de arquitectura

1. **Cada módulo tiene 4 archivos:** `README.md`, `index.ts`, `service.ts`, `types.ts`
2. **`index.ts`** exporta solo la API pública (funciones, tipos compartibles)
3. **`service.ts`** contiene la implementación interna (Firebase + IndexedDB)
4. **`types.ts`** contiene tipos exclusivos del módulo
5. **Un módulo NUNCA escribe** en la colección de otro módulo
6. **Para leer de otro módulo**, se importa su `index.ts` (nunca directo a service.ts)
7. **`shared/`** contiene solo infraestructura: Firebase init, IndexedDB genérico, sync

## Documentación de diagnóstico

Cada `README.md` incluye:
- **Identidad:** colección, contador, ubicación
- **Dependencias:** qué módulos necesita (y por qué)
- **Dependientes:** qué módulos/páginas lo usan
- **API completa:** cada función con su flujo
- **Tipos:** interfaces del módulo
- **Diagnóstico rápido:** tabla síntoma → causa → dónde mirar
- **Firebase Console queries:** consultas útiles para debug
