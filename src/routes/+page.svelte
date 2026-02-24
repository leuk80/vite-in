<script lang="ts">
  const features = [
    { icon: '⚡', title: 'In Sekunden erstellt', text: 'Einladung ausfüllen, Link teilen – fertig. Kein Account nötig.' },
    { icon: '✅', title: 'RSVP in Echtzeit', text: 'Gäste sagen direkt zu oder ab. Du bekommst sofort eine E-Mail.' },
    { icon: '📅', title: 'Kalender-Export', text: 'Gäste können das Event mit einem Klick in ihren Kalender speichern.' },
  ]
</script>

<main>
  <nav>
    <span class="logo">vite.in</span>
    <a href="/create" class="nav-cta">Einladung erstellen</a>
  </nav>

  <section class="hero">
    <h1>Einladungen,<br>die ankommen.</h1>
    <p class="subtitle">Erstelle in Sekunden eine digitale Einladung – für Geburtstage, Firmenevents, Hochzeiten und mehr. Kein Account, kein Stress.</p>
    <a href="/create" class="btn-primary">Jetzt kostenlos erstellen →</a>
    <p class="hint">Dauert weniger als 2 Minuten</p>
  </section>

  <section class="features">
    {#each features as f}
      <div class="feature">
        <span class="icon">{f.icon}</span>
        <h3>{f.title}</h3>
        <p>{f.text}</p>
      </div>
    {/each}
  </section>

  <section class="cta-section">
    <h2>Bereit für deine nächste Einladung?</h2>
    <a href="/create" class="btn-primary">Einladung erstellen →</a>
  </section>

  <footer>
    <p>© 2025 vite.in</p>
  </footer>
</main>

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  main {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #111;
  }

  /* Nav */
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #eee;
  }
  .logo {
    font-weight: 700;
    font-size: 1.2rem;
    letter-spacing: -0.5px;
  }
  .nav-cta {
    padding: 0.5rem 1rem;
    border: 1px solid #111;
    border-radius: 6px;
    text-decoration: none;
    color: #111;
    font-size: 0.9rem;
  }
  .nav-cta:hover { background: #111; color: white; }

  /* Hero */
  .hero {
    max-width: 640px;
    margin: 6rem auto;
    padding: 0 2rem;
    text-align: center;
  }
  h1 {
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1.1;
    margin-bottom: 1.5rem;
  }
  .subtitle {
    font-size: 1.1rem;
    color: #555;
    line-height: 1.6;
    margin-bottom: 2rem;
  }
  .btn-primary {
    display: inline-block;
    padding: 0.9rem 2rem;
    background: #111;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
  }
  .btn-primary:hover { background: #333; }
  .hint {
    margin-top: 0.8rem;
    font-size: 0.85rem;
    color: #999;
  }

  /* Features */
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 2rem;
    max-width: 900px;
    margin: 0 auto 6rem;
    padding: 0 2rem;
  }
  .feature {
    padding: 1.5rem;
    border: 1px solid #eee;
    border-radius: 12px;
  }
  .icon { font-size: 1.8rem; }
  .feature h3 {
    margin: 0.8rem 0 0.4rem;
    font-size: 1rem;
    font-weight: 600;
  }
  .feature p { font-size: 0.9rem; color: #666; line-height: 1.5; }

  /* CTA Section */
  .cta-section {
    text-align: center;
    padding: 4rem 2rem;
    background: #f9f9f9;
  }
  .cta-section h2 {
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 1.5rem;
  }

  /* Footer */
  footer {
    text-align: center;
    padding: 2rem;
    color: #999;
    font-size: 0.85rem;
  }
</style>