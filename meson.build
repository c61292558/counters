project('counters', 'vala',
          version: '1.0.0',
    meson_version: '>= 0.62.0',
  default_options: [ 'warning_level=2', 'werror=false', ],
)

i18n = import('i18n')
gnome = import('gnome')

adw_dep = dependency('libadwaita-1', version: '>= 1.5.0')
gi_dep = dependency('gobject-introspection-1.0', version: '>= 0.10.1')
gio_dep = dependency('gio-2.0')
glib_dep = dependency('glib-2.0')
gobject_dep =  dependency('gobject-2.0')
gtk_dep = dependency('gtk4', version :'>= 4.5')
sqlite3_dep =  dependency('sqlite3')

gjs_dep = dependency('gjs-1.0', version: '>= 1.54.0')
gjs_console = gjs_dep.get_variable(pkgconfig: 'gjs_console')

tsc = find_program('tsc', required: true)

if get_option('profile') == 'development'
  profile = 'Devel'
else
  profile = ''
endif
application_id = 'io.gitlab.guillermop.Counters@0@'.format(profile)

prefix = get_option('prefix')
bindir = join_paths(prefix, get_option('bindir'))
libdir = join_paths(prefix, get_option('libdir'))
datadir = join_paths(prefix, get_option('datadir'))
pkgdatadir = join_paths(datadir, application_id)

subdir('lib')
subdir('data')
subdir('src')
subdir('po')

install_symlink(
  meson.project_name(),
  pointing_to: join_paths(pkgdatadir, application_id),
  install_dir: bindir
)

gnome.post_install(
     glib_compile_schemas: true,
    gtk_update_icon_cache: true,
  update_desktop_database: true,
)
