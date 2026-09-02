# 🇪🇸 Monitor de Cita Previa (4010 Toma de Huellas / TIE)

[中文](README.md) | [English](README.en.md) | [Español](README.es.md)

> Proyecto **sin fines de lucro y de interés público** para la monitorización de disponibilidad de citas previas de extranjería en España. Proporciona un panel transparente en tiempo real y mapa de calor histórico para ayudar a los solicitantes a conocer los patrones de apertura de citas.

🌐 **Panel en directo**: [https://aijiesd520.github.io/cita_status.github.io/](https://aijiesd520.github.io/cita_status.github.io/)

---

## 📌 Acerca del Proyecto

Conseguir cita para la expedición de tarjeta de identidad de extranjero (`4010 - POLICIA-TOMA DE HUELLA (EXPEDICIÓN DE TARJETA)`) suele ser complicado debido a la falta de regularidad y transparencia en la liberación de citas.

Este proyecto realiza comprobaciones pasivas continuas y visualiza los datos en un mapa de calor de disponibilidad de los últimos 7 días.

### ✨ Características
- **Estado en tiempo real**: Visibilidad instantánea de citas disponibles en Madrid, Barcelona, Valencia y otras provincias.
- **Mapa de calor de 7 días**: 48 intervalos diarios (bloques de 30 minutos de 00:00 a 24:00 hora de Madrid) que reflejan los patrones históricos de liberación de citas.
- **Ligero y seguro**: Sitio estático sin rastreadores de terceros, completamente adaptable a dispositivos móviles y escritorio.

---

## 📊 Leyenda del Panel

- 🟩 **Verde (6 tonalidades)**: Citas disponibles detectadas (más oscuro = mayor frecuencia).
- 🟥 **Rojo**: Error de comprobación o incidencia de red.
- ⬛ **Gris oscuro**: Comprobación correcta, sin citas disponibles.
- ⬜ **Gris claro**: Sin datos o intervalo futuro.

*Nota: Todas las horas corresponden a la **hora oficial de Madrid (España)**.*

---

## ⚠️ Descargo de Responsabilidad

1. Este proyecto es **estrictamente informativo y sin ánimo de lucro**.
2. **NO se ofrecen servicios de intermediación, reserva, compraventa ni tramitación de citas**.
3. **NO se recopila ningún tipo de dato personal**.
4. Las citas deben solicitarse exclusivamente a través de la sede electrónica oficial: [Sede Electrónica - Cita Previa](https://icp.administracionelectronica.gob.es/icpplustiem/citar).

