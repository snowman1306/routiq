import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Quote
} from 'lucide-react';
import LiveClock from '../components/LiveClock';
import './Landing.css';

function Landing() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        } else {
          entry.target.classList.remove('is-revealed');
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');
    revealElements.forEach(el => observer.observe(el));

    return () => {
      revealElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <div className={`landing-premium ${isVisible ? 'is-visible' : ''}`}>
      <div className="landing-atmosphere" aria-hidden="true">
        <div className="atmosphere-orb orb-one" />
        <div className="atmosphere-orb orb-two" />
        <div className="atmosphere-orb orb-three" />
        <div className="atmosphere-grid" />
        <div className="atmosphere-rings" />
        <span className="floating-seed seed-one" />
        <span className="floating-seed seed-two" />
        <span className="floating-seed seed-three" />
        <span className="floating-seed seed-four" />
      </div>

      <nav className="landing-nav-minimal">
        <div className="nav-container">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true" />
            <div className="brand-serif">RoutiQ</div>
          </div>
          <div className="nav-actions-minimal">
            <div className="landing-clock-wrap">
              <LiveClock compact />
            </div>
            <Link to="/login" className="nav-link-minimal">Log in</Link>
            <Link to="/register" className="nav-btn-minimal">Start growing</Link>
          </div>
        </div>
      </nav>

      <section className="hero-editorial reveal">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-meta-row">
              <div className="hero-eyebrow">Botanical ritual system</div>
              <div className="hero-status">Mindful structure, visible momentum</div>
            </div>

            <h1 className="hero-headline-serif">
              Rituals that feel <span className="italic-serif">alive</span>, not administered.
            </h1>

            <p className="hero-subline">
              A ritual-driven system for those who find traditional checklists cold, but still need
              a clear structure to grow.
            </p>

            <div className="hero-actions-premium">
              <Link to="/register" className="btn-premium-primary">
                Build your ritual
                <ArrowRight size={20} />
              </Link>
              <Link to="/login" className="btn-premium-secondary">
                Enter dashboard
              </Link>
            </div>

            <div className="hero-proof reveal-stagger">
              <div className="proof-item">
                <span className="proof-value">Mood-aware</span>
                <span className="proof-label">Reflection woven into every growth vine</span>
              </div>
              <div className="proof-item">
                <span className="proof-value">Visual growth</span>
                <span className="proof-label">Progress that blooms instead of listing tasks</span>
              </div>
              <div className="proof-item">
                <span className="proof-value">Calm analytics</span>
                <span className="proof-label">Data translated into soft, readable signals</span>
              </div>
            </div>
          </div>

          <div className="hero-scene">
            <div className="scene-panel scene-panel-primary">
              <span className="scene-tag">Daily cadence</span>
              <h2>06:10 AM</h2>
              <p>Reset, journal, and build momentum before the noise starts.</p>
              <div className="scene-pulse">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="scene-panel scene-panel-secondary">
              <div className="scene-kpi">
                <span>Focus signal</span>
                <strong>84%</strong>
              </div>
              <div className="scene-meter">
                <div className="scene-meter-row">
                  <span>Rhythm</span>
                  <div><i style={{ width: '88%' }} /></div>
                </div>
                <div className="scene-meter-row">
                  <span>Energy</span>
                  <div><i style={{ width: '76%' }} /></div>
                </div>
                <div className="scene-meter-row">
                  <span>Clarity</span>
                  <div><i style={{ width: '91%' }} /></div>
                </div>
              </div>
            </div>

            <div className="scene-panel scene-panel-quote">
              <Quote size={24} />
              <p>
                Track what you nurture. Let the interface mirror the life you are trying to grow.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="problem-section reveal">
        <div className="container">
          <div className="problem-grid">
            <div className="problem-copy reveal">
              <span className="section-label">The Friction</span>
              <h2 className="serif-title">The Boxy Prison</h2>
              <p>
                Most habit trackers feel like a second job. They are clinical, cold, and prioritize 
                digits over depth. They treat your life like a spreadsheet to be managed, 
                ignoring the atmospheric context of why we actually grow.
              </p>
              <ul className="problem-list">
                <li>
                  <strong>Clinical Coldness:</strong> Numbers don't capture the ritual of growth.
                </li>
                <li>
                  <strong>Data Without Context:</strong> Tracking "completion" ignores how you actually felt.
                </li>
                <li>
                  <strong>Admin Fatigue:</strong> Most apps feel like admin work, not a sanctuary.
                </li>
              </ul>
            </div>
            <div className="problem-visual reveal">
              <div className="binary-comparison">
                <div className="comparison-side comparison-them">
                  <span>Their approach</span>
                  <div className="boxy-mockup">
                    <div className="boxy-item" />
                    <div className="boxy-item" />
                    <div className="boxy-item" />
                  </div>
                  <p>Cold, transactional, boxy.</p>
                </div>
                <div className="comparison-side comparison-us">
                  <span>The RoutiQ way</span>
                  <div className="organic-mockup">
                    <div className="organic-blob" />
                    <div className="organic-seed" />
                  </div>
                  <p>Atmospheric, organic, alive.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="philosophy-section reveal">
        <div className="philosophy-container">
          <div className="philosophy-grid">
            <div className="philosophy-text reveal">
              <span className="section-label">The Philosophy</span>
              <h2>Structure with pulse, clarity, and a little atmosphere.</h2>
              <p>
                Most habit apps feel like spreadsheets wearing pastel. RoutiQ leans into a richer
                idea: routines as living systems, where reflection, movement, and progress belong
                in the same visual language.
              </p>
            </div>

            <div className="philosophy-quote reveal">
              <div className="quote-mark">
                <Quote size={28} />
              </div>
              <p className="quote-text">Growth should look cultivated, not corporate.</p>
              <cite>The RoutiQ field note</cite>
            </div>
          </div>
        </div>
      </section>

      <section className="features-editorial reveal">
        <div className="container">
          <div className="editorial-header reveal">
            <span className="section-label">Core tools</span>
            <h2 className="serif-title">Signals designed to feel human</h2>
          </div>

          <div className="features-minimal-grid reveal-stagger">
            <div className="feature-item-minimal">
              <div className="feature-topline">
                <div className="feature-num">01</div>
                <div className="feature-ornament feature-ornament-rise" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <h3>Living growth</h3>
              <p className="feature-poetic">Evolutionary Visualization</p>
              <p className="feature-functional">
                Your habits bloom into unique 3D botanical models that grow only when you do,
                turning data into a digital garden.
              </p>
            </div>

            <div className="feature-item-minimal">
              <div className="feature-topline">
                <div className="feature-num">02</div>
                <div className="feature-ornament feature-ornament-wave" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <h3>Mood resonance</h3>
              <p className="feature-poetic">Emotional Pattern Mapping</p>
              <p className="feature-functional">
                Stop tracking just "completion" and start seeing which moods actually drive your
                consistency through deep-integrated reflection.
              </p>
            </div>

            <div className="feature-item-minimal">
              <div className="feature-topline">
                <div className="feature-num">03</div>
                <div className="feature-ornament feature-ornament-grid" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <h3>Quiet analytics</h3>
              <p className="feature-poetic">Stress-Free Insights</p>
              <p className="feature-functional">
                Get the clarity you need without the "dashboard fatigue." We translate numbers into
                soft, high-fidelity signals that are easy to digest.
              </p>
            </div>

            <div className="feature-item-minimal">
              <div className="feature-topline">
                <div className="feature-num">04</div>
                <div className="feature-ornament feature-ornament-glow" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <h3>Ambient flow</h3>
              <p className="feature-poetic">Ritualized Interface</p>
              <p className="feature-functional">
                A glassmorphic design system with motion and grain that transforms daily administration
                into an atmospheric ritual.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-editorial reveal">
        <div className="cta-inner-minimal reveal">
          <span className="section-label">Begin the ritual</span>
          <h2>Make your routine feel cultivated from the first click.</h2>
          <p>
            Start with a calmer system, a sharper rhythm, and a landing experience that finally
            feels alive.
          </p>
          <Link to="/register" className="btn-premium-large">
            Start growing now
          </Link>
        </div>
      </section>

      <footer className="footer-premium">
        <div className="footer-container-minimal">
          <div className="footer-top-minimal">
            <div className="footer-brand-serif">RoutiQ</div>
            <div className="footer-nav-minimal">
              <Link to="/login">Log in</Link>
              <Link to="/register">Create account</Link>
            </div>
          </div>
          <div className="footer-bottom-minimal">
            <p>Routines with atmosphere, not admin panels.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
