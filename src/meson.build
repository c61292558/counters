tsc_out = meson.project_build_root() / 'tsc-out'

typescript = custom_target(
  'typescript-compile',
  build_by_default: true,
  build_always_stale: true,
  command: [ tsc, '--strict' ],
  output: ['tsc-output'],
)

source_res_conf = configuration_data()
source_res_conf.set('profile', profile)
src_res = gnome.compile_resources(
  application_id + '.src',
  configure_file(
  	input: 'io.gitlab.guillermop.Counters.src.gresource.xml.in',
  	output: '@BASENAME@',
  	configuration: source_res_conf
  ),
  dependencies: typescript,
  source_dir: tsc_out,
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir
)

app_conf = configuration_data()
app_conf.set('profile', profile)
app_conf.set('prefix', prefix)
app_conf.set('libdir', libdir)
app_conf.set('datadir', datadir)
app_conf.set('PACKAGE_VERSION', meson.project_version())
app_conf.set('GJS', gjs_console)
app_conf.set('APP_ID', application_id)

app = configure_file(
  input: 'io.gitlab.guillermop.Counters.in',
  output: application_id,
  install: true,
  install_dir: pkgdatadir,
  configuration: app_conf
)

run_target('run',
  command: app,
  depends: [
    data_res,
    src_res,
  ]
)
