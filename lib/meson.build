counters_lib = shared_library(
  'counters',
  files(
    'counters.vala',
  ),
  vala_gir: 'Counters-1.gir',
  dependencies: [glib_dep, gobject_dep, sqlite3_dep, gio_dep],
  install: true,
  install_dir: [true],
)

custom_target('counters typelib',
  command: [find_program('g-ir-compiler'), '--shared-library', 'libcounters.so', '--output', '@OUTPUT@', meson.current_build_dir() / 'Counters-1.gir'],
  output: 'Counters-1.typelib',
  depends: counters_lib,
  install: true,
  install_dir: get_option('libdir') / 'girepository-1.0'
)
