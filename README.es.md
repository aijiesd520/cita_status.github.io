# Monitor de citas Cita Previa 4010 · Página de estado

[中文](README.md) | [English](README.en.md) | Español

Proyecto comunitario sin ánimo de lucro: monitorización pasiva de la disponibilidad de citas para la toma de huellas del permiso de residencia en España (trámite 4010), publicando «qué provincia tuvo citas y cuándo» para quienes no consiguen cita. Este directorio = el árbol de trabajo del repositorio público de GitHub + el sitio de GitHub Pages.

**Panel**: una tarjeta de estado en vivo por provincia + una tabla al estilo del gráfico de contribuciones de GitHub — 7 filas (una por día, de más antigua a más reciente de arriba abajo, hoy en la última fila) × 48 celdas (30 min cada una, 00:00→24:00). De 1 a 6 aciertos con cita = seis tonos de verde de claro a oscuro, errores en rojo, «no hay cita» en gris oscuro, «sin datos» en gris claro. Las filas llevan fecha y día de la semana, con regla de horas abajo. Adaptado al móvil (las celdas se ajustan a la pantalla; toca una celda para ver detalles). Todas las horas son de Madrid; las fechas siempre en formato inequívoco `MM-DD`.

## Despliegue en 5 pasos (en la máquina que ejecuta el monitor)

0. Requisitos: `monitor/run.py` funcionando (ver `../HANDOFF.md`); git y Python 3 instalados.

1. **Crea un repositorio público en GitHub** (p. ej. `cita-status`) y activa Pages:
   Settings → Pages → Source: rama `main`, `/ (root)`.

2. **Convierte este directorio en ese repositorio** (solo la primera vez):

   ```bash
   cd monitor/stauts_page
   git init
   git add -A
   git commit -m "status page"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/cita-status.git
   git push -u origin main
   ```

   Guarda las credenciales en el gestor de credenciales del sistema (Windows: Git Credential Manager). **Nunca guardes un token en ningún archivo.**
   Si git user.name/email no están configurados: `git config --global user.name/user.email` primero.

3. **Cadencia de sondeo**: `DELAY=300` en `monitor/.env` (valor por defecto; una ronda cada 5 minutos, acorde con las celdas de 30 min / seis tonos de verde).

4. **Ejecuta el script de push junto a run.py** (cada ronda escrita en status.json se añade al historial y se publica):

   ```bash
   python run.py                # terminal A: monitor de sondeo (existente)
   python push_github.py        # terminal B: push + fuente de datos de Pages
   ```

5. **Verifica**: abre `https://<tu-usuario>.github.io/cita-status/`.
   La primera compilación de Pages tarda 1–2 minutos; después, cada push puede tardar ~10 minutos más (caché de Pages).

## Vista local / aceptación de colores

```bash
python push_github.py --selftest   # autotest del script de push
python demo.py                     # genera datos falsos (¡borra d/!)
python -m http.server              # abre http://127.0.0.1:8000
```

Los datos de demo son falsos — **borra `d/` antes de publicar al repositorio público**.

## Notas

- Repositorio público = todos los datos de sondeo son públicos (es el objetivo; asegúrate de que es aceptable).
- 1 commit por ronda (cada 5 min ≈ 288/día); GitHub no tiene límite estricto. Si importara, agrupa pushes en push_github.py (no implementado).
- Deja `PUSH_URL` vacío en `.env`: la publicación la gestiona el script de este directorio; no uses ambos.
- Para desarrollo / migrar de máquina / resolución de problemas: **lee primero `HANDOFF.md`** (documento de traspaso para agentes).
