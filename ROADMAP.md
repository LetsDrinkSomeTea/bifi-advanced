# BiFi-Plan

## Priorität 1: Sicherheit & Datenintegrität

- [x] profile api leakt hidden achievements definitionen, gibt es weitere leaks? (In Bearbeitung)
- [x] Richtige Fehlermeldungen, Confirm Dialogs usw.

## Priorität 2: Developer Experience (DX) & Architektur

- [ ] swagger ui oder vergleichbares (Umstellung auf `@hono/zod-openapi` in einem großen Refactoring)
- [ ] Texte und Magic Numbers/Konstanten an einem gesammelten Ort (i18n vorbereiten, pro Nutzer einstellbar)

## Priorität 3: UX Feinschliff & Testing

- [ ] Nutzern die Möglichkeit geben ein Bild hochzuladen (Simpelste Variante: Lokales Filesystem)
- [ ] Admin, Statistik und social tabs angleichen (komponente erstellen). Styling von social nehmen, Trennung der Tabs in einzelne Dateien wie bei Admin. Möglichkeiten links/rechts zu swipen um zwischen den Tabs zu wechseln
- [ ] Anpassen auf Handy, Dark und Light mode, usw.
- [ ] Emojis durch Icons ersetzen oder entfernen (außer ggf. bei achievements).

## Priorität 4: Evaluierung & Dokumentation

- [ ] Unit-Tests erstellen (Wird bei Bedarf evaluiert)
- [ ] Welche Features sind vorgesehen/zum Teil implementiert werden aber nicht verwendet?
- [ ] Code Dokumentation, README, usw.
