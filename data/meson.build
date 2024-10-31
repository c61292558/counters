blueprints = custom_target(
  'blueprints',
  input: files(
    'ui/days-row.blp',
    'ui/dialog.blp',
    'ui/help-overlay.blp',
    'ui/history-card.blp',
    'ui/inner-page.blp',
    'ui/main-page.blp',
    'ui/preferences.blp',
    'ui/row.blp',
    'ui/window.blp',
  ),
  output: '.',
  command: [
    find_program('blueprint-compiler'),
    'batch-compile',
    '@OUTPUT@',
    '@CURRENT_SOURCE_DIR@',
    '@INPUT@'
  ]
)

data_res = gnome.compile_resources(
  application_id + '.data',
  'io.gitlab.guillermop.Counters.data.gresource.xml',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir,
  dependencies: [blueprints]
)

desktop_conf = configuration_data()
desktop_conf.set('application_id', application_id)

desktop_file = i18n.merge_file (
  type: 'desktop',
  input: configure_file(
    input: 'io.gitlab.guillermop.Counters.desktop.in.in',
    output: '@BASENAME@',
    configuration: desktop_conf
  ),
  output: '@0@.desktop'.format(application_id),
  po_dir: '../po',
  install: true,
  install_dir: join_paths(datadir, 'applications')
)

desktop_utils = find_program('desktop-file-validate', required: false)
if desktop_utils.found()
  test('Validate desktop file', desktop_utils, args: [desktop_file])
endif

appstream_conf = configuration_data()
appstream_conf.set('application_id', application_id)
appstream_file = i18n.merge_file(
  input: configure_file(
    input: 'io.gitlab.guillermop.Counters.appdata.xml.in.in',
    output: '@BASENAME@',
    configuration: appstream_conf
  ),
  output: '@0@.appdata.xml'.format(application_id),
  po_dir: '../po',
  install: true,
  install_dir: join_paths(datadir, 'metainfo')
)

appstream_util = find_program('appstream-util', required: false)
if appstream_util.found()
  test('Validate appstream file', appstream_util, args: ['validate', appstream_file])
endif

gsettings_conf = configuration_data()
gsettings_conf.set('application_id', application_id)
configure_file(
  input: 'io.gitlab.guillermop.Counters.gschema.xml.in',
  output: '@0@.gschema.xml'.format(application_id),
  configuration: gsettings_conf,
  install: true,
  install_dir: join_paths(datadir, 'glib-2.0/schemas')
)

compile_schemas = find_program('glib-compile-schemas', required: false)
if compile_schemas.found()
  test('Validate schema file', compile_schemas,
    args: ['--strict', '--dry-run', meson.current_source_dir()]
  )
endif

subdir('icons')
