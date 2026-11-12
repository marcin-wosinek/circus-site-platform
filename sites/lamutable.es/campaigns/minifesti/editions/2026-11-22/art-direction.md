# Minifesti · 22 noviembre 2026 · dirección visual

Dirección de trabajo v1 · 12 noviembre 2026. Basada en el cartel facilitado por
el usuario; preparada para producir las diez piezas de esta edición. No supone
aprobación de imágenes finales ni verificación de los datos del evento.

## Referencia y alcance

Fuente: `/Users/marcinwosinek/Downloads/Copia de Minifesti.svg`, cartel vertical
de 1080 × 1350. SHA-256:
`8bda7930ee5f289f00a7c5971bb544bd076793967d662e64267ab6ebfa34f784`.
Se revisaron el SVG y la [referencia visual del kit](../../../../brand/assets/minifesti-reference.png).
El render de comprobación del SVG pierde algunos elementos enmascarados; la
referencia del kit permite ver la rama y el lema completos. El original se
mantiene fuera del repositorio.

Usar el [kit de La Mutable v0.1.0, borrador](../../../../brand/README.md) y sus
[tokens](../../../../brand/tokens.json). Esta dirección concreta la campaña;
no cambia el diseño del tema WordPress ni la identidad general de la asociación.
Los campos de marca y variante de `event.json` siguen pendientes de sincronizar
al preparar la producción; para esta dirección visual rige este documento.

## Idea central

**Movimiento, comunidad y cuidado: cuatro prácticas conectadas por una misma
onda cálida.** Un cartel cercano de encuentro local: cuerpos reales, luz natural,
papel crema y energía compartida. La fotografía cuenta lo que ocurre; la franja
orgánica reúne las prácticas y da espacio a la información.

Del original conservar: collage de cuatro fotos, marcos y separaciones crema,
banda central de bordes ondulados, titular muy alto y condensado, fecha frambuesa
y una pequeña rama de hojas verde apagado. El lema «Movimiento, comunidad y
cuidado» sirve como referencia de tono; su inclusión como texto final depende
del cierre del brief.

## Paleta y formas

- `cream`: fondo, márgenes, calles entre fotos y banda informativa. Debe sentirse
  como un soporte continuo que conecta toda la pieza.
- `ink`: título, horarios y datos prácticos.
- `burgundy`: fecha y un único énfasis secundario. Para texto pequeño, preferir
  este token al rosa más suave del lema original.
- `olive`: detalle botánico discreto, con variaciones suaves de acuarela.
- Los demás colores aparecen de forma natural en las fotografías; no añadir
  bloques coral, violeta u ocre ni cambiar de paleta según el taller.

Una sola banda crema ancha, con curvas suaves y asimétricas en sus bordes
superior e inferior. Puede cruzar toda la pieza; debe dejar espacio real para
leer y mostrar los cuerpos. Fotos rectangulares, sin esquinas redondeadas.
Sin sombras marcadas, degradados decorativos, pegatinas ni marcos adicionales.
La rama es un acento lateral pequeño, nunca un marco vegetal ni un motivo
repetido por cada foto. Evitar textura que ensucie el texto.

## Tipografía y jerarquía

El original tiene letras altas, estrechas y de gran peso. La familia exacta no
está identificada; usar la propuesta `heading` del kit, Barlow Condensed en peso
fuerte, una vez disponibles y verificadas sus fuentes. No deformar letras para
imitarla. Datos y texto de apoyo: `body` del kit.

En la pieza general: MINIFESTI → fecha → horario → lugar y demás datos
confirmados. «La Mutable» acompaña como organizadora. En una pieza de taller:
título del taller → fecha y hora propias → docente → identificación Minifesti
La Mutable. Mantener un titular dominante y pocas líneas auxiliares; permitir
dos o tres líneas para un nombre largo antes de reducirlo hasta hacerlo ilegible.

Usar tinta o burdeos sobre crema. Corregir el blanco sobre crema de «La Mutable»
en el original: no tiene contraste suficiente. Reservar blanco para fondos
oscuros comprobados. Objetivos mínimos: 4.5:1 en texto normal, 3:1 en texto grande.
Todo texto y logotipo se compone después como capa editable; no pedir al
generador que dibuje letras, fechas, direcciones o marcas.

## Fotografía

Usar las cuatro fotos de `sources/` como imágenes de los talleres, conservando
su correspondencia en `event.json`. La posición del cartel original inspira la
composición, pero no determina el orden del programa de esta edición.

Tratamiento natural y cálido: piel creíble, luz de tarde, contraste moderado y
color presente sin saturación excesiva. Ajustar exposición y temperatura lo
justo para que convivan las fotos, sin aplicar un filtro sepia uniforme. Conservar
rostros, manos, apoyos y relación entre cuerpos. La banda no debe tapar el gesto
que explica la práctica. Revisar los puntos focales antes de fijar los recortes.
No regenerar participantes, inventar posturas ni sustituir documentación real
por personas sintéticas. La generación puede aportar la banda o el adorno
botánico, separados de las fotos originales y de la tipografía.

## Adaptación de las diez piezas

| Pieza | Composición |
| --- | --- |
| Instagram general | Cuatro fotos con protagonismo equilibrado, dos arriba y dos abajo, separadas por calles crema estrechas. Banda ondulada central como en el original; título y fecha en su zona más despejada. |
| Portada Facebook | Recomponer en horizontal: dos parejas de fotos a los lados y una zona crema central para título y fecha. Curvas más bajas para conservar fotografía visible. Mantener los datos esenciales en el centro, revisar recortes y no incluir URLs ni QR. |
| Cuatro Instagram de taller | Foto del taller protagonista en aproximadamente dos tercios del área fotográfica; las otras tres siguen visibles en una franja o mosaico secundario. Mismo sistema de banda, tipografía, márgenes y color en los cuatro. El nombre del taller ocupa la primera jerarquía. |
| Cuatro portadas Meetup | Dirección propuesta: una sola foto protagonista por taller, con banda crema ondulada lateral o inferior y el mismo acento burdeos. Confirmar en el brief si se necesitan las otras fotos y qué texto incluir antes de producir. |

Las proporciones anteriores son de composición, no dimensiones de exportación.
Consultar los IDs de formato en `recipe.json` y el
[catálogo de medios](../../../../../../../docs/media-formats.md). Recomponer cada
relación de aspecto; no estirar ni recortar automáticamente el cartel vertical.
Comprobar lectura en móvil y zonas seguras del destino antes de exportar.

## Base para las siguientes solicitudes de imagen

«Minifesti La Mutable, edición 22 noviembre: composición cálida de encuentro de
movimiento y cuidado, fotografía real de los talleres facilitada por separado,
fondo papel crema, una banda ancha de bordes orgánicos ondulados, pequeños
acentos frambuesa y una rama discreta de hojas verde oliva con acabado de
acuarela. Mantener áreas crema despejadas para componer después el texto.
Respetar la composición específica del formato y la jerarquía fotográfica del
taller. Sin texto ni logotipos generados.»

Adjuntar la referencia visual y especificar pieza, formato y foto protagonista
en cada solicitud. Mantener esta misma variante en toda la edición. Para un
collage final, montar las fotos originales y el texto en una composición
editable, conservando por separado cualquier decoración generada.

## Antes de producir

Cerrar los datos y el idioma en [brief.md](brief.md); verificar especialmente
el año, lugar, títulos, horarios y docentes. El «22 NOV.», el horario y la
dirección que aparecen en el cartel son contenido de referencia, no validación
del evento actual. El logo Samadhi visible en el original no es el logo de
La Mutable: incluirlo solo si corresponde a esta edición y se confirma su uso.
No redibujar ni generar logos. Revisar permisos de fotos, fuentes y rama si se
reutiliza el elemento original; comprobar contraste y recortes en las diez
piezas antes de aprobarlas.
