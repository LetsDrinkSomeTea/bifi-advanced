import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '../hooks/useAuth';

// Datenschutzerklärung für bifi.dpsg-balingen.de. Läuft auf demselben Server wie
// Cloud und Anmeldung, deren Teil steht auf dpsg-balingen.de/datenschutz/#cloud.

const WEBSITE = 'https://dpsg-balingen.de';

function H2({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <h2 className="text-lg font-semibold mt-8 mb-2">{children}</h2>;
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
      {children}
    </a>
  );
}

export function Datenschutz(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-16 text-sm leading-relaxed text-foreground/90 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
        <Link
          href={user ? '/' : '/login'}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          {user ? 'Zurück zur App' : 'Zur Anmeldung'}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight mt-4">Datenschutzerklärung</h1>

        <p>
          BiFi (<strong>bifi.dpsg-balingen.de</strong>) ist die digitale Getränkeliste unseres
          Stammes. Hier informieren wir dich gemäß der Datenschutz-Grundverordnung (DSGVO), welche
          personenbezogenen Daten die App verarbeitet. Für unsere Website, die Cloud und die
          zentrale Anmeldung gilt die{' '}
          <ExternalLink href={`${WEBSITE}/datenschutz/`}>
            Datenschutzerklärung auf dpsg-balingen.de
          </ExternalLink>
          .
        </p>

        <H2>Verantwortlicher</H2>
        <p>
          <strong>DPSG Balingen e.V.</strong>
          <br />
          Hirschbergstraße 112/2, 72336 Balingen
          <br />
          E-Mail:{' '}
          <a href="mailto:info@dpsg-balingen.de" className="underline">
            info@dpsg-balingen.de
          </a>
        </p>

        <H2>Wo die Daten liegen</H2>
        <p>
          BiFi läuft auf demselben von uns gemieteten Server wie unsere Cloud und die Anmeldung: bei
          der Contabo GmbH (Aschauer Straße 32a, 81549 München) in einem Rechenzentrum in der EU.
          Mit Contabo besteht ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO). Datenbank,
          hochgeladene Bilder und Sitzungen liegen nur auf diesem Server.
        </p>
        <p>
          Die App bindet keine fremden Dienste ein: Sie lädt keine Schriften, Skripte oder Bilder
          von anderen Servern und gibt keine Daten an Dritte weiter. Auch die QR-Codes für
          Gruppeneinladungen erzeugt dein Browser selbst.
        </p>

        <H2>Anmeldung</H2>
        <p>
          Du meldest dich über unsere zentrale Anmeldung (Pfadi-Auth, Software authentik) an, die
          auf demselben Server läuft. BiFi erhält dabei deinen Namen, deine E-Mail-Adresse, eine
          eindeutige Kennung und deine Gruppenzugehörigkeiten, aus denen sich deine Rolle in der App
          ergibt (Mitglied, Moderator, Admin). Wo ein Konto mit eigenem Passwort eingerichtet ist,
          speichern wir das Passwort nur als Hash (Argon2), nie im Klartext.
        </p>

        <H2>Welche Daten wir verarbeiten</H2>
        <ul>
          <li>
            <strong>Kontodaten:</strong> Anzeigename, Benutzername, E-Mail-Adresse, Rolle,
            Kontostand und, wenn du eines hochlädst, dein Profilbild. Hochgeladene Bilder rechnen
            wir in ein einheitliches Format um; Metadaten wie Standort oder Kameradaten werden dabei
            entfernt.
          </li>
          <li>
            <strong>Buchungen:</strong> Käufe (Produkt, Menge, Preis, Zeitpunkt), Einzahlungen,
            Überweisungen mit Verwendungszweck, Stornos, Jackpot-Ergebnisse und Prost-Gutscheine.
          </li>
          <li>
            <strong>Soziale Funktionen:</strong> Freundschaften, Gruppen, Anstupser, Achievements,
            Einträge im Aktivitäts-Feed, Benachrichtigungen und Favoriten.
          </li>
          <li>
            <strong>Protokoll in der App:</strong> wichtige Aktionen wie Anmeldungen, Käufe,
            Einzahlungen, Rollenänderungen und Löschungen, jeweils mit Zeitpunkt, handelnder Person
            und IP-Adresse (Audit-Log).
          </li>
          <li>
            <strong>Server-Protokolle:</strong> Beim Aufruf verarbeitet unser Server IP-Adresse,
            Zeitpunkt, aufgerufene Adresse und Browser, um den Betrieb abzusichern und Missbrauch zu
            erkennen.
          </li>
        </ul>

        <H2>Wer was sieht</H2>
        <ul>
          <li>
            <strong>Alle angemeldeten Mitglieder:</strong> deinen Anzeigenamen, dein Profilbild,
            deine Rolle, deine Achievements und deine Platzierung in der Rangliste. Ausgaben und
            Anzahl der Käufe in der Rangliste sehen nur deine Freunde.
          </li>
          <li>
            <strong>Deine Freunde:</strong> deine Aktivitäten im Feed (z. B. Achievements,
            verschickte Prosts oder dass du jemandem Geld geschickt hast, ohne Betrag) und deine
            Statistiken wie Ausgaben und Lieblingsprodukte.
          </li>
          <li>
            <strong>Gruppenmitglieder:</strong> gemeinsame Käufe und Aktivitäten in der Gruppe.
          </li>
          <li>
            <strong>Bei Überweisungen:</strong> Betrag und Verwendungszweck sehen nur du und die
            andere Person.
          </li>
          <li>
            <strong>Moderatoren und Admins</strong> (die Kassenverantwortlichen): Kontostände und
            Buchungen, um Guthaben einzubuchen, Fehler zu korrigieren und offene Beträge
            einzufordern. Das Audit-Log sehen nur Admins.
          </li>
        </ul>

        <H2>Rechtsgrundlagen</H2>
        <p>
          Konto, Buchungen und Abrechnung verarbeiten wir, um dir die Getränkeliste bereitzustellen
          (Art. 6 Abs. 1 lit. b DSGVO). Das gilt auch für die sozialen Funktionen, die du selbst
          nutzt, etwa Freundschaften und Gruppen. Protokolldaten verarbeiten wir aufgrund unseres
          berechtigten Interesses an einem sicheren Betrieb und einer nachvollziehbaren Kasse (Art.
          6 Abs. 1 lit. f DSGVO).
        </p>

        <H2>Cookies und Speicher im Browser</H2>
        <p>
          BiFi setzt ein einziges, technisch notwendiges Cookie (<code>bifi_session</code>), das
          dich angemeldet hält (§ 25 Abs. 2 Nr. 2 TDDDG). Außerdem merkt sich dein Browser lokal ein
          paar Einstellungen, etwa den zuletzt geöffneten Tab, bereits gesehene Achievements und ob
          du den Hinweis zum Installieren ausgeblendet hast. Damit die App installierbar ist und
          schnell lädt, speichert dein Browser ihre Dateien zwischen. Es gibt keine Analyse-,
          Tracking- oder Werbe-Cookies.
        </p>

        <H2>Speicherdauer</H2>
        <ul>
          <li>
            Deine Sitzung endet beim Abmelden oder spätestens 30 Tage nach deiner letzten Nutzung.
          </li>
          <li>
            IP-Adressen im Audit-Log löschen wir automatisch nach 30 Tagen, Server-Protokolle nach
            spätestens 30 Tagen.
          </li>
          <li>
            Konto, Buchungen und Inhalte speichern wir, solange dein Konto besteht. Verlässt du den
            Stamm, gleichen wir deinen Kontostand aus und sperren dein Konto. Buchungen bewahren wir
            auf, solange sie für die Kassenführung des Stammes nötig sind; ein Konto ohne Buchungen
            löschen wir vollständig.
          </li>
        </ul>

        <H2>Deine Rechte</H2>
        <p>Dir stehen bezüglich deiner personenbezogenen Daten folgende Rechte zu:</p>
        <ul>
          <li>Auskunft über die von uns verarbeiteten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <p>
          Wende dich dazu an{' '}
          <a href="mailto:info@dpsg-balingen.de" className="underline">
            info@dpsg-balingen.de
          </a>{' '}
          oder an unsere <ExternalLink href={`${WEBSITE}/kontakt/`}>Ansprechpartner</ExternalLink>.
        </p>

        <H2>Beschwerderecht bei der Aufsichtsbehörde</H2>
        <p>
          Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren. Zuständig ist:
        </p>
        <p>
          <strong>
            Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg
          </strong>
          <br />
          Königstraße 10a, 70173 Stuttgart
          <br />
          <ExternalLink href="https://www.baden-wuerttemberg.datenschutz.de">
            www.baden-wuerttemberg.datenschutz.de
          </ExternalLink>
        </p>

        <p className="mt-8 text-muted-foreground">
          <ExternalLink href={`${WEBSITE}/impressum/`}>Impressum</ExternalLink>
        </p>
      </div>
    </div>
  );
}
