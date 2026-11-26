# Porra electoral 29-N

Web para facer a porra das eleccións xerais do 29 de novembro de 2026 entre compañeiros.
Non fai falta iniciar sesión: as porras gárdanse nunha folla de Google Sheets a través dun
pequeno script de Google Apps Script.

- `index.html` — a web (servida por GitHub Pages).
- `Codigo.gs` — o script que garda e serve as porras desde Google Sheets.

## Regras

- Todos comezan con 100 puntos. Cada escano de diferenza co resultado (sumando PP, PSOE, VOX e BNG) resta 1 punto. Mínimo 0.
- Desempate: quen enviase antes a súa última versión do prognóstico.
- Prazo: sábado 28/11 ás 23:59 (hora peninsular). Ata entón ninguén ve as porras dos demais; o script tampouco as devolve.
- Referencias na táboa: Xerais 2023 e CIS (centro da horquilla).

## Posta en marcha (unha soa vez)

### 1. Folla de cálculo e script

1. Crea unha folla nova en <https://sheets.new> (chámaa, por exemplo, «Porra 29-N»).
2. Menú **Extensións → Apps Script**.
3. Borra o que haxa no editor e pega o contido de [`Codigo.gs`](Codigo.gs). Garda (icona do disquete).
4. Na barra superior escolle a función `setup` e preme **Executar**. Google pedirá permisos: acepta
   (se sae «Google non verificou esta aplicación», preme **Configuración avanzada → Ir a … (non seguro)**; o script é teu).
   Crearanse as pestanas **Porras** e **Resultado**.
5. Preme **Implementar → Nova implementación**:
   - Tipo: **Aplicación web**.
   - Executar como: **Eu**.
   - Quen ten acceso: **Calquera** (*Anyone*).
   - Preme **Implementar** e copia o enderezo que remata en `/exec`.

### 2. Conectar a web

1. Abre `index.html` aquí en GitHub e preme a icona do lapis (editar).
2. Busca a liña `const API_URL = "PEGA_AQUI_O_ENDEREZO_DE_APPS_SCRIPT";` e substitúe o texto entre comiñas polo enderezo `/exec`.
3. Preme **Commit changes**.

### 3. GitHub Pages

1. **Settings → Pages**.
2. En **Source** escolle **Deploy from a branch**, rama `main`, cartafol `/ (root)`, e preme **Save**.
3. Nun ou dous minutos a web estará en `https://mrnettlepatch.github.io/porra29n/`.

## Durante a porra

- **Ver as porras:** pestana **Porras** da folla. A columna `token` é a clave secreta de cada xogador para editar a súa porra; non a compartas.
- **Borrar duplicados ou bromas:** borra a fila enteira na pestana **Porras**.
- **Meter o resultado:** na pestana **Resultado**, fila 2, os catro números (PP, PSOE, VOX, BNG). Vale tamén o escrutinio parcial; a web recalcula a clasificación (actualízase cada minuto).
- Cada persoa pode cambiar a súa porra desde o mesmo navegador no que a enviou, ata o peche.

## Se cambias o script

Despois de editar `Codigo.gs` en Apps Script: **Implementar → Xestionar implementacións → lapis → Versión: Nova versión → Implementar**. Así o enderezo `/exec` segue sendo o mesmo.
