import React, { useState } from 'react';

/**
 * Replicador visual de la galería de marcos del prototipo original.
 * Muestra exactamente las 14 pantallas/estados del prototipo HTML en marcos tipo teléfono,
 * permitiendo comparar el diseño de referencia 1:1.
 */
export const PrototypeGallery: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'screens' | 'sheets'>('all');

  return (
    <div className="w-full bg-[var(--fw-bg)] min-h-screen pb-20">
      <div className="max-w-[1200px] mx-auto px-4 pt-6">
        <div className="fw-logo">Flyway</div>
        <h1 className="text-3xl font-bold mt-1 mb-2">Prototipo de pantallas y hojas</h1>
        <p className="fw-muted text-sm max-w-3xl leading-relaxed">
          Usa las mismas clases de <code>snippets/theme/flyway-theme.css</code> y tokens OutSystems UI.
          A continuación se presentan todas las pantallas y estados del prototipo interactivo para inspección de diseño y validación de componentes.
        </p>

        {/* Filtros rápidos */}
        <div className="flex gap-2 my-4">
          <button
            type="button"
            className={`btn fw-chip ${filter === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas las pantallas (14)
          </button>
          <button
            type="button"
            className={`btn fw-chip ${filter === 'screens' ? 'is-active' : ''}`}
            onClick={() => setFilter('screens')}
          >
            Vistas principales
          </button>
          <button
            type="button"
            className={`btn fw-chip ${filter === 'sheets' ? 'is-active' : ''}`}
            onClick={() => setFilter('sheets')}
          >
            Hojas inferiores (Sheets)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-8 justify-center px-4 py-6">
        {/* 1. Explorar */}
        {(filter === 'all' || filter === 'screens') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Explorar</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Guía 7.4 · Matriz filas 1-8</span>
            </figcaption>
            <div className="phone">
              <div className="fw-page">
                <div className="fw-header">
                  <div className="fw-logo">Flyway</div>
                  <div className="fw-avatar">👤</div>
                </div>
                <h1>Comienza tu aventura</h1>
                <p className="fw-muted text-sm">Cuéntanos qué buscas y armamos tu ruta en minutos.</p>
                <div className="fw-card">
                  <label className="fw-label">Destino</label>
                  <input className="form-control w-full" defaultValue="Valparaíso, Chile" />
                  <div className="fw-row-2">
                    <div>
                      <label className="fw-label">Ida</label>
                      <input className="form-control w-full" defaultValue="15-01-2026" />
                    </div>
                    <div>
                      <label className="fw-label">Vuelta</label>
                      <input className="form-control w-full" defaultValue="16-01-2026" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <label className="fw-label m-0">Presupuesto</label>
                    <span className="fw-badge">$ CLP</span>
                  </div>
                  <div className="fw-segmented mt-1">
                    <div className="fw-segmented__item">Económico</div>
                    <div className="fw-segmented__item is-active">Estándar</div>
                    <div className="fw-segmented__item">Premium</div>
                  </div>
                  <label className="fw-label">Intereses</label>
                  <div>
                    <span className="fw-chip">🥾 Aventura</span>
                    <span className="fw-chip is-active">🍽️ Gastronomía</span>
                    <span className="fw-chip">☕ Relajación</span>
                    <span className="fw-chip">🌿 Naturaleza</span>
                    <span className="fw-chip is-active">🏛️ Cultura</span>
                  </div>
                  <button className="btn btn-primary mt-3">Planificar mi Ruta</button>
                </div>
                <div className="fw-section-title">
                  <h2>Inspírate</h2>
                </div>
                <div className="fw-inspo fw-img-fallback">
                  <span className="fw-inspo__label">Torres del Paine</span>
                </div>
              </div>
              <nav className="fw-bottom-nav">
                <div className="fw-bottom-nav__item is-active">✈️<span>Explorar</span></div>
                <div className="fw-bottom-nav__item">♥<span>Guardados</span></div>
              </nav>
            </div>
          </figure>
        )}

        {/* 2. Explorar errores */}
        {(filter === 'all' || filter === 'screens') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Explorar · errores</b>
              <span className="text-[var(--fw-text-muted)] text-xs">ValidateForm</span>
            </figcaption>
            <div className="phone">
              <div className="fw-page">
                <div className="fw-header">
                  <div className="fw-logo">Flyway</div>
                  <div className="fw-avatar">👤</div>
                </div>
                <h1>Comienza tu aventura</h1>
                <p className="fw-muted text-sm">Cuéntanos qué buscas y armamos tu ruta en minutos.</p>
                <div className="fw-card">
                  <label className="fw-label">Destino</label>
                  <input className="form-control not-valid w-full" placeholder="¿A dónde quieres ir?" defaultValue="" />
                  <div className="fw-field-error">Cuéntanos a dónde quieres ir.</div>
                  <div className="fw-row-2">
                    <div>
                      <label className="fw-label">Ida</label>
                      <input className="form-control w-full" defaultValue="15-01-2026" />
                    </div>
                    <div>
                      <label className="fw-label">Vuelta</label>
                      <input className="form-control w-full" defaultValue="16-01-2026" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <label className="fw-label m-0">Presupuesto</label>
                    <span className="fw-badge">$ CLP</span>
                  </div>
                  <div className="fw-segmented mt-1">
                    <div className="fw-segmented__item">Económico</div>
                    <div className="fw-segmented__item is-active">Estándar</div>
                    <div className="fw-segmented__item">Premium</div>
                  </div>
                  <label className="fw-label">Intereses</label>
                  <div>
                    <span className="fw-chip">🥾 Aventura</span>
                    <span className="fw-chip">🍽️ Gastronomía</span>
                    <span className="fw-chip">☕ Relajación</span>
                    <span className="fw-chip">🌿 Naturaleza</span>
                    <span className="fw-chip">🏛️ Cultura</span>
                  </div>
                  <div className="fw-field-error">Elige al menos un interés para personalizar tu ruta.</div>
                  <button className="btn btn-primary mt-3">Planificar mi Ruta</button>
                </div>
                <div className="fw-section-title">
                  <h2>Inspírate</h2>
                </div>
                <div className="fw-inspo fw-img-fallback">
                  <span className="fw-inspo__label">Torres del Paine</span>
                </div>
              </div>
              <nav className="fw-bottom-nav">
                <div className="fw-bottom-nav__item is-active">✈️<span>Explorar</span></div>
                <div className="fw-bottom-nav__item">♥<span>Guardados</span></div>
              </nav>
            </div>
          </figure>
        )}

        {/* 3. Generando */}
        {(filter === 'all' || filter === 'screens') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Generando</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Bloque LoadingOverlay</span>
            </figcaption>
            <div className="phone">
              <div className="fw-page">
                <div className="fw-header">
                  <div className="fw-logo">Flyway</div>
                  <div className="fw-avatar">👤</div>
                </div>
                <h1>Comienza tu aventura</h1>
                <p className="fw-muted text-sm">Cuéntanos qué buscas y armamos tu ruta en minutos.</p>
                <div className="fw-card opacity-50">
                  <label className="fw-label">Destino</label>
                  <input className="form-control w-full" defaultValue="Valparaíso, Chile" />
                </div>
              </div>
              <nav className="fw-bottom-nav">
                <div className="fw-bottom-nav__item is-active">✈️<span>Explorar</span></div>
                <div className="fw-bottom-nav__item">♥<span>Guardados</span></div>
              </nav>
              <div className="fw-loading" role="status">
                <div className="fw-spinner" />
                <h2>Creando tu ruta</h2>
                <div className="fw-muted">Ajustando a tu presupuesto…</div>
              </div>
            </div>
          </figure>
        )}

        {/* 4. Itinerario Pestaña 1 */}
        {(filter === 'all' || filter === 'screens') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Itinerario</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Guía 7.5 · pestaña Itinerario</span>
            </figcaption>
            <div className="phone">
              <div className="fw-page">
                <div className="fw-back">←</div>
                <div className="fw-trip-head">
                  <h1>Valparaíso, Chile</h1>
                  <div className="fw-meta">
                    📅 15 - 16 Ene 2026 <span className="fw-badge">Presupuesto Medio</span>
                  </div>
                </div>
                <button className="btn fw-btn-outline" style={{ padding: '8px 16px' }}>
                  Rehacer itinerario
                </button>
                <div style={{ display: 'flex', gap: 24, margin: '16px 0', borderBottom: '1px solid var(--fw-border)' }}>
                  <b style={{ padding: '8px 0', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }}>
                    Itinerario
                  </b>
                  <b style={{ padding: '8px 0', color: 'var(--fw-text-muted)' }}>Costos y tips</b>
                </div>
                <div className="fw-day">
                  <span className="fw-day-number">1</span>
                  <div>
                    <h3 style={{ margin: 0 }}>Día 1</h3>
                    <div className="fw-muted">15 de Enero · $16.000 CLP</div>
                  </div>
                </div>
                <div className="fw-timeline">
                  <div className="fw-activity">
                    <div className="fw-timeline__dot" />
                    <div className="fw-activity__card">
                      <div className="fw-activity__open">
                        <div className="fw-activity__img fw-img-fallback" />
                        <div className="fw-activity__body">
                          <span className="fw-time">09:30 - 11:00</span>
                          <div className="fw-activity__title">Paseo por el Cerro Alegre</div>
                          <div className="fw-activity__desc">Explora murales, galerías y cafés del barrio patrimonial.</div>
                        </div>
                      </div>
                      <div className="fw-activity__foot">
                        <span className="fw-cost">Gratis</span>
                        <span className="fw-cat">🚶 Caminata</span>
                        <button className="fw-kebab" aria-label="Opciones">⋮</button>
                      </div>
                    </div>
                  </div>
                  <div className="fw-transfer">🚶 Ascensor El Peral · 5 min</div>
                  <div className="fw-activity">
                    <div className="fw-timeline__dot" />
                    <div className="fw-activity__card">
                      <div className="fw-activity__open">
                        <div className="fw-activity__img fw-img-fallback" />
                        <div className="fw-activity__body">
                          <span className="fw-time fw-time--food">13:00 - 14:30</span>
                          <div className="fw-activity__title">Almuerzo en el Mercado Cardonal</div>
                          <div className="fw-activity__desc">Mariscos y comida casera a buen precio.</div>
                        </div>
                      </div>
                      <div className="fw-activity__foot">
                        <span className="fw-cost">$9.000 CLP</span>
                        <span className="fw-cat">🍽️ Comida</span>
                        <button className="fw-kebab" aria-label="Opciones">⋮</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="fw-sticky-cta">
                <button className="btn btn-primary">Guardar Ruta</button>
              </div>
              <nav className="fw-bottom-nav">
                <div className="fw-bottom-nav__item is-active">✈️<span>Explorar</span></div>
                <div className="fw-bottom-nav__item">♥<span>Guardados</span></div>
              </nav>
            </div>
          </figure>
        )}

        {/* 5. Itinerario Pestaña Costos y Tips */}
        {(filter === 'all' || filter === 'screens') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Itinerario</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Pestaña Costos y tips</span>
            </figcaption>
            <div className="phone">
              <div className="fw-page">
                <div className="fw-back">←</div>
                <div className="fw-trip-head">
                  <h1>Valparaíso, Chile</h1>
                  <div className="fw-meta">
                    📅 15 - 16 Ene 2026 <span className="fw-badge">Presupuesto Medio</span>
                  </div>
                </div>
                <button className="btn fw-btn-outline" style={{ padding: '8px 16px' }}>
                  Rehacer itinerario
                </button>
                <div style={{ display: 'flex', gap: 24, margin: '16px 0', borderBottom: '1px solid var(--fw-border)' }}>
                  <b style={{ padding: '8px 0', color: 'var(--fw-text-muted)' }}>Itinerario</b>
                  <b style={{ padding: '8px 0', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }}>
                    Costos y tips
                  </b>
                </div>
                <div className="fw-card">
                  <div className="fw-muted">Costo total estimado</div>
                  <div className="fw-price" style={{ fontSize: 28 }}>$45.000 CLP</div>
                  <table className="fw-cost-table">
                    <tbody>
                      <tr><td>Día 1</td><td>$16.000 CLP</td></tr>
                      <tr><td>Día 2</td><td>$29.000 CLP</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="fw-card mt-4">
                  <h3>Tips para ahorrar</h3>
                  <div className="fw-tip">💡 Compra la tarjeta de ascensores para varios viajes.</div>
                  <div className="fw-tip">💡 Almuerza con menú del día en el Almendral.</div>
                </div>
                <div className="fw-card mt-4">
                  <h3>Por qué esta ruta</h3>
                  <p className="fw-muted text-sm">Combina cerros patrimoniales a pie con comida local y miradores gratuitos.</p>
                </div>
              </div>
              <div className="fw-sticky-cta">
                <button className="btn btn-primary">Guardar Ruta</button>
              </div>
              <nav className="fw-bottom-nav">
                <div className="fw-bottom-nav__item is-active">✈️<span>Explorar</span></div>
                <div className="fw-bottom-nav__item">♥<span>Guardados</span></div>
              </nav>
            </div>
          </figure>
        )}

        {/* 6. Hoja Detalle de actividad */}
        {(filter === 'all' || filter === 'sheets') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Hoja · Detalle de actividad</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Popup fw-sheet</span>
            </figcaption>
            <div className="phone">
              <div className="fw-backdrop" />
              <div className="popup-dialog fw-sheet" style={{ position: 'absolute' }}>
                <div className="fw-sheet__hero fw-img-fallback" />
                <p><span className="fw-time">09:30 - 11:00</span></p>
                <h2>Paseo por el Cerro Alegre</h2>
                <p className="text-sm">Explora murales, galerías y cafés del barrio patrimonial.</p>
                <div className="fw-info-block">
                  <h3>Por qué la incluimos</h3>
                  <div className="fw-muted text-sm">Encaja con tu interés en Cultura y es gratis.</div>
                </div>
                <div className="fw-info-block">
                  <h3>Un poco de historia</h3>
                  <div className="fw-muted text-sm">Barrio ligado a inmigrantes europeos del siglo XIX.</div>
                </div>
                <div className="fw-info-block">
                  <h3>Tip de ahorro</h3>
                  <div className="fw-muted text-sm">Recorre a pie y usa el ascensor solo para subir.</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <span className="fw-price">Gratis</span>
                  <button className="btn fw-btn-outline" style={{ padding: '10px 20px' }}>Cerrar</button>
                </div>
              </div>
            </div>
          </figure>
        )}

        {/* 7. Hoja Menú ⋮ */}
        {(filter === 'all' || filter === 'sheets') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Hoja · Menú ⋮</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Popup fw-sheet</span>
            </figcaption>
            <div className="phone">
              <div className="fw-backdrop" />
              <div className="popup-dialog fw-sheet" style={{ position: 'absolute' }}>
                <h3>Paseo por el Cerro Alegre</h3>
                <div className="fw-sheet__option">🕒 Ajustar horario</div>
                <div className="fw-sheet__option">🔄 Cambiar esta actividad</div>
                <div className="fw-sheet__option fw-sheet__option--danger">🗑️ Eliminar</div>
              </div>
            </div>
          </figure>
        )}

        {/* 8. Hoja Ajustar horario */}
        {(filter === 'all' || filter === 'sheets') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Hoja · Ajustar horario</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Error de validación</span>
            </figcaption>
            <div className="phone">
              <div className="fw-backdrop" />
              <div className="popup-dialog fw-sheet" style={{ position: 'absolute' }}>
                <h2>Ajustar horario</h2>
                <div className="fw-row-2">
                  <div>
                    <label className="fw-label">Inicio</label>
                    <input className="form-control w-full" defaultValue="11:00" />
                  </div>
                  <div>
                    <label className="fw-label">Término</label>
                    <input className="form-control not-valid w-full" defaultValue="10:30" />
                  </div>
                </div>
                <div className="fw-field-error">La hora de término debe ser posterior a la de inicio.</div>
                <button className="btn btn-primary mt-4">Guardar horario</button>
                <button className="btn fw-btn-ghost w-full mt-2">Cancelar</button>
              </div>
            </div>
          </figure>
        )}

        {/* 9. Hoja Cambiar actividad */}
        {(filter === 'all' || filter === 'sheets') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Hoja · Cambiar actividad</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Motivo opcional</span>
            </figcaption>
            <div className="phone">
              <div className="fw-backdrop" />
              <div className="popup-dialog fw-sheet" style={{ position: 'absolute' }}>
                <h2>Cambiar esta actividad</h2>
                <p className="fw-muted text-sm">Te propondremos otra opción para el mismo horario.</p>
                <input className="form-control w-full" placeholder="¿Qué prefieres? Ej: algo gratis, bajo techo…" />
                <button className="btn btn-primary mt-4">Buscar otra opción</button>
                <button className="btn fw-btn-ghost w-full mt-2">Cancelar</button>
              </div>
            </div>
          </figure>
        )}

        {/* 10. Hoja Eliminar */}
        {(filter === 'all' || filter === 'sheets') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Hoja · Eliminar</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Confirmación</span>
            </figcaption>
            <div className="phone">
              <div className="fw-backdrop" />
              <div className="popup-dialog fw-sheet" style={{ position: 'absolute' }}>
                <h2>¿Eliminar actividad?</h2>
                <p className="fw-muted text-sm mb-4">Se quitará La Sebastiana y se recalcularán los costos.</p>
                <button className="fw-btn-danger">Eliminar</button>
                <button className="btn fw-btn-ghost w-full mt-2">Cancelar</button>
              </div>
            </div>
          </figure>
        )}

        {/* 11. Rutas Guardadas */}
        {(filter === 'all' || filter === 'screens') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Rutas Guardadas</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Guía 7.6 · TripCard</span>
            </figcaption>
            <div className="phone">
              <div className="fw-page">
                <h1>Mis Rutas Guardadas</h1>
                <p className="fw-muted text-sm mb-4">Tus próximas aventuras, listas cuando las necesites.</p>
                <div className="fw-trip-card">
                  <div className="fw-trip-card__media fw-img-fallback" style={{ height: 180 }}>
                    <span className="fw-season">Verano</span>
                    <span className="fw-fav" style={{ color: 'var(--color-error)' }}>♥</span>
                  </div>
                  <div className="fw-trip-card__body">
                    <h3>Valparaíso Mágico</h3>
                    <div className="fw-trip-card__summary">Cerros coloridos, arte callejero y cocina porteña.</div>
                    <div className="fw-trip-card__foot">
                      <span className="fw-price">$45.000 CLP</span>
                      <button className="btn btn-primary">Ver Itinerario</button>
                    </div>
                  </div>
                </div>
                <div className="fw-trip-card">
                  <div className="fw-trip-card__media fw-img-fallback" style={{ height: 180 }}>
                    <span className="fw-season">Primavera</span>
                    <span className="fw-fav" style={{ color: 'var(--color-error)' }}>♥</span>
                  </div>
                  <div className="fw-trip-card__body">
                    <h3>Patagonia Salvaje</h3>
                    <div className="fw-trip-card__summary">Senderos, lagos turquesa y miradores del parque.</div>
                    <div className="fw-trip-card__foot">
                      <span className="fw-price">$380.000 CLP</span>
                      <button className="btn fw-btn-outline">Ver Itinerario</button>
                    </div>
                  </div>
                </div>
              </div>
              <nav className="fw-bottom-nav">
                <div className="fw-bottom-nav__item">✈️<span>Explorar</span></div>
                <div className="fw-bottom-nav__item is-active">♥<span>Guardados</span></div>
              </nav>
            </div>
          </figure>
        )}

        {/* 12. Estado Vacío */}
        {(filter === 'all' || filter === 'screens') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Rutas Guardadas</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Estado vacío</span>
            </figcaption>
            <div className="phone">
              <div className="fw-page">
                <h1>Mis Rutas Guardadas</h1>
                <div className="fw-empty">
                  <div className="fw-empty__icon">♡</div>
                  <h2>Aún no guardas rutas</h2>
                  <p className="fw-muted text-sm">Cuando guardes un itinerario, lo verás aquí.</p>
                  <button className="btn btn-primary mt-2">Planificar mi primera ruta</button>
                </div>
              </div>
              <nav className="fw-bottom-nav">
                <div className="fw-bottom-nav__item">✈️<span>Explorar</span></div>
                <div className="fw-bottom-nav__item is-active">♥<span>Guardados</span></div>
              </nav>
            </div>
          </figure>
        )}

        {/* 13. Login */}
        {(filter === 'all' || filter === 'screens') && (
          <figure>
            <figcaption className="flex flex-col mb-2 text-sm">
              <b className="font-bold">Login</b>
              <span className="text-[var(--fw-text-muted)] text-xs">Guía 7.7 · credenciales inválidas</span>
            </figcaption>
            <div className="phone">
              <div className="fw-login">
                <div className="fw-logo">Flyway</div>
                <h1 style={{ textAlign: 'center' }}>Bienvenido de vuelta</h1>
                <p className="fw-muted text-sm" style={{ textAlign: 'center' }}>
                  Inicia sesión para guardar y ver tus rutas.
                </p>
                <div className="fw-card">
                  <label className="fw-label">Correo</label>
                  <input className="form-control w-full" defaultValue="camila@correo.cl" />
                  <label className="fw-label">Contraseña</label>
                  <input className="form-control not-valid w-full" type="password" defaultValue="xxxxxx" />
                  <div className="fw-field-error">Correo o contraseña incorrectos.</div>
                  <button className="btn btn-primary mt-4">Iniciar sesión</button>
                </div>
                <button className="btn fw-btn-ghost mt-3">Seguir sin cuenta</button>
              </div>
            </div>
          </figure>
        )}
      </div>
    </div>
  );
};
