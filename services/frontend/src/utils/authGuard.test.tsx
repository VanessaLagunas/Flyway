import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  isUserAuthenticated,
  getSavedTripsStorageKey,
  evaluateSaveTripAttempt,
  SAVE_AUTH_REQUIRED_MESSAGE,
} from './authGuard.js';
import { INITIAL_VALPARAISO_TRIP } from '../data/mockTrips.js';
import { LoginScreen } from '../screens/LoginScreen.js';
import { ItineraryScreen } from '../screens/ItineraryScreen.js';
import { SavedTripsScreen } from '../screens/SavedTripsScreen.js';

function hexToRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function wcagContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = hexToRelativeLuminance(fgHex);
  const l2 = hexToRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractCssBlock(css: string, selectorSnippet: string): string {
  const escaped = selectorSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}[^{]*\\{([^}]*)\\}`, 'm');
  const match = css.match(regex);
  return match ? match[1] : '';
}

function extractCssPropHex(block: string, prop: 'background' | 'color'): string {
  const regex = new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*(#[0-9A-Fa-f]{3,6})`, 'm');
  const match = block.match(regex);
  assert.ok(match, `Expected CSS property "${prop}: #..." inside block: ${block}`);
  return match[1];
}

describe('Requirement 1 — Save Itinerary / Route Auth Guard & Per-User Isolation', () => {
  test('isUserAuthenticated rejects null, empty, whitespace, or partial credentials', () => {
    assert.equal(isUserAuthenticated(null, null), false);
    assert.equal(isUserAuthenticated(undefined, undefined), false);
    assert.equal(isUserAuthenticated('', 'user@flyway.cl'), false);
    assert.equal(isUserAuthenticated('   ', 'user@flyway.cl'), false);
    assert.equal(isUserAuthenticated('valid-jwt', null), false);
    assert.equal(isUserAuthenticated('valid-jwt', '   '), false);
    assert.equal(isUserAuthenticated('valid-jwt', 'user@flyway.cl'), true);
  });

  test('getSavedTripsStorageKey isolates storage per normalized user email and returns null when unauthenticated', () => {
    assert.equal(getSavedTripsStorageKey(null), null);
    assert.equal(getSavedTripsStorageKey(''), null);
    assert.equal(getSavedTripsStorageKey('   '), null);
    assert.equal(
      getSavedTripsStorageKey('  Viajero@Flyway.CL '),
      'flyway_saved_trips:viajero@flyway.cl'
    );
    assert.notEqual(
      getSavedTripsStorageKey('ana@flyway.cl'),
      getSavedTripsStorageKey('pedro@flyway.cl')
    );
  });

  test('evaluateSaveTripAttempt blocks unauthenticated users and returns Spanish sign-in message without mutating savedTrips', () => {
    const initialList = [INITIAL_VALPARAISO_TRIP];
    const newTrip = { ...INITIAL_VALPARAISO_TRIP, id: 'atacama-99', title: 'Atacama' };

    for (const [token, email] of [
      [null, null],
      ['', ''],
      ['   ', 'ana@flyway.cl'],
      ['jwt-token', '   '],
      [null, 'ana@flyway.cl'],
    ] as const) {
      const res = evaluateSaveTripAttempt({
        authToken: token,
        userEmail: email,
        savedTrips: initialList,
        tripToSave: newTrip,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.action, 'require_auth');
      assert.strictEqual(res.nextSavedTrips, initialList);
      assert.equal(res.savedTrip, null);
      assert.match(res.message, /iniciar sesión/i);
      assert.match(res.message, /guardar/i);
    }
  });

  test('evaluateSaveTripAttempt saves and toggles removal for authenticated users', () => {
    const newTrip = {
      ...INITIAL_VALPARAISO_TRIP,
      id: 'pucon-101',
      isFavorite: false,
    };

    const saveRes = evaluateSaveTripAttempt({
      authToken: 'jwt-valid',
      userEmail: 'ana@flyway.cl',
      savedTrips: [],
      tripToSave: newTrip,
    });
    assert.equal(saveRes.allowed, true);
    assert.equal(saveRes.action, 'saved');
    assert.equal(saveRes.message, null);
    assert.equal(saveRes.nextSavedTrips.length, 1);
    assert.equal(saveRes.nextSavedTrips[0].id, 'pucon-101');
    assert.equal(saveRes.nextSavedTrips[0].isFavorite, true);

    const removeRes = evaluateSaveTripAttempt({
      authToken: 'jwt-valid',
      userEmail: 'ana@flyway.cl',
      savedTrips: saveRes.nextSavedTrips,
      tripToSave: newTrip,
    });
    assert.equal(removeRes.allowed, true);
    assert.equal(removeRes.action, 'removed');
    assert.equal(removeRes.nextSavedTrips.length, 0);
  });

  test('ItineraryScreen shows auth-required alert when unauthenticated save message is active and never shows saved label when unauthenticated', () => {
    const unauthHtml = renderToStaticMarkup(
      <ItineraryScreen
        trip={INITIAL_VALPARAISO_TRIP}
        onBack={() => {}}
        onSaveTrip={() => {}}
        isSaved={true}
        isAuthenticated={false}
        saveAuthMessage={SAVE_AUTH_REQUIRED_MESSAGE}
        onRequestLogin={() => {}}
        onUpdateTrip={() => {}}
      />
    );

    assert.ok(
      !unauthHtml.includes('Ruta Guardada en Mis Rutas'),
      'Unauthenticated user must not see Ruta Guardada label even if isSaved prop is true'
    );
    assert.ok(unauthHtml.includes('Guardar Ruta'));
    assert.ok(unauthHtml.includes('id="sheet-save-auth-required"'));
    assert.ok(unauthHtml.includes('id="save-auth-required-alert"'));
    assert.ok(unauthHtml.includes('Inicia sesión para guardar la ruta'));
    assert.ok(unauthHtml.includes(SAVE_AUTH_REQUIRED_MESSAGE));
    assert.ok(unauthHtml.includes('id="btn-save-go-to-login"'));

    const authSavedHtml = renderToStaticMarkup(
      <ItineraryScreen
        trip={INITIAL_VALPARAISO_TRIP}
        onBack={() => {}}
        onSaveTrip={() => {}}
        isSaved={true}
        isAuthenticated={true}
        onUpdateTrip={() => {}}
      />
    );
    assert.ok(authSavedHtml.includes('Ruta Guardada en Mis Rutas'));
  });

  test('SavedTripsScreen displays sign-in required state when userEmail is null', () => {
    const html = renderToStaticMarkup(
      <SavedTripsScreen
        savedTrips={[]}
        onViewTrip={() => {}}
        onRemoveTrip={() => {}}
        onGoToExplore={() => {}}
        userEmail={null}
        onOpenLogin={() => {}}
      />
    );

    assert.ok(html.includes('id="saved-trips-auth-required"'));
    assert.match(html, /Inicia sesión para guardar rutas/i);
    assert.ok(html.includes('id="btn-saved-login-cta"'));
  });
});

describe('Requirement 2 & 3 — LoginScreen Contrast & Single Google OAuth Button', () => {
  const cssPath = fs.existsSync(path.resolve(process.cwd(), 'src/index.css'))
    ? path.resolve(process.cwd(), 'src/index.css')
    : path.resolve(process.cwd(), 'services/frontend/src/index.css');
  const indexCss = fs.readFileSync(cssPath, 'utf8');

  test('index.css defines --fw-primary tokens and WCAG AA/AAA contrast on Iniciar sesión / Crear cuenta tabs and buttons', () => {
    assert.match(indexCss, /--fw-primary:\s*#[0-9A-Fa-f]{6}/);
    assert.match(indexCss, /--fw-primary-hover:\s*#[0-9A-Fa-f]{6}/);

    const switcherBlock = extractCssBlock(indexCss, '.fw-auth-switcher');
    const switcherBg = extractCssPropHex(switcherBlock, 'background');

    const inactiveTabBlock = extractCssBlock(indexCss, '.fw-auth-tab');
    const inactiveFg = extractCssPropHex(inactiveTabBlock, 'color');

    const activeTabBlock = extractCssBlock(indexCss, '.fw-auth-tab.is-active');
    const activeBg = extractCssPropHex(activeTabBlock, 'background');
    const activeFg = extractCssPropHex(activeTabBlock, 'color');

    const loginPrimaryBlock = extractCssBlock(indexCss, '.fw-login .btn-primary');
    const primaryBg = extractCssPropHex(loginPrimaryBlock, 'background');
    const primaryFg = extractCssPropHex(loginPrimaryBlock, 'color');

    const googleBtnBlock = extractCssBlock(indexCss, '.fw-google-btn');
    const googleBg = extractCssPropHex(googleBtnBlock, 'background');
    const googleFg = extractCssPropHex(googleBtnBlock, 'color');

    const inactiveContrast = wcagContrastRatio(inactiveFg, switcherBg);
    const activeContrast = wcagContrastRatio(activeFg, activeBg);
    const submitContrast = wcagContrastRatio(primaryFg, primaryBg);
    const googleContrast = wcagContrastRatio(googleFg, googleBg);

    assert.ok(
      inactiveContrast >= 7.0,
      `Expected inactive auth tab contrast >= 7.0 (AAA), got ${inactiveContrast.toFixed(2)}`
    );
    assert.ok(
      activeContrast >= 7.0,
      `Expected active auth tab contrast >= 7.0 (AAA), got ${activeContrast.toFixed(2)}`
    );
    assert.ok(
      submitContrast >= 7.0,
      `Expected primary submit button contrast >= 7.0 (AAA), got ${submitContrast.toFixed(2)}`
    );
    assert.ok(
      googleContrast >= 12.0,
      `Expected Google button contrast >= 12.0, got ${googleContrast.toFixed(2)}`
    );
  });

  test('LoginScreen renders high-contrast mode switcher and ONLY ONE "Continuar con Google" button', () => {
    (import.meta as any).env = {
      ...((import.meta as any).env || {}),
      VITE_GOOGLE_CLIENT_ID: '1234567890-abc.apps.googleusercontent.com',
    };

    const html = renderToStaticMarkup(
      <LoginScreen
        authPromptMessage={SAVE_AUTH_REQUIRED_MESSAGE}
        onLoginSuccess={() => {}}
        onContinueWithoutAccount={() => {}}
      />
    );

    // Must render auth prompt banner when redirected from save route
    assert.ok(html.includes('id="login-auth-prompt-banner"'));

    // Mode tabs use high-contrast .fw-auth-tab classes, never broken white-on-transparent utility
    assert.ok(html.includes('class="fw-auth-tab is-active" id="tab-mode-login"'));
    assert.ok(html.includes('class="fw-auth-tab " id="tab-mode-register"'));
    assert.ok(!html.includes('bg-[var(--fw-primary)]'));

    // Exactly ONE "Continuar con Google" button rendered even when GOOGLE_CLIENT_ID is configured
    const googleTextMatches = html.match(/Continuar con Google/gi) || [];
    assert.equal(
      googleTextMatches.length,
      1,
      `Expected exactly 1 "Continuar con Google" button, found ${googleTextMatches.length}`
    );

    const googleIdMatches = html.match(/id="btn-google-login"/g) || [];
    assert.equal(googleIdMatches.length, 1);

    // Verify LoginScreen source no longer calls renderButton to inject a second Google iframe button
    const loginSrcPath = fs.existsSync(path.resolve(process.cwd(), 'src/screens/LoginScreen.tsx'))
      ? path.resolve(process.cwd(), 'src/screens/LoginScreen.tsx')
      : path.resolve(process.cwd(), 'services/frontend/src/screens/LoginScreen.tsx');
    const loginSrc = fs.readFileSync(loginSrcPath, 'utf8');
    assert.ok(
      !loginSrc.includes('accounts.id.renderButton') && !loginSrc.includes('googleBtnContainerRef'),
      'LoginScreen must not render a duplicate GIS iframe button alongside #btn-google-login'
    );
  });
});
