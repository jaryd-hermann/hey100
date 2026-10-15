const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# hey100:ios-build-fixes';

// Normalizes pod deployment targets and defuses fmt's consteval FMT_STRING, both of
// which fail the build on the Xcode 26 toolchain. Lives in a plugin because
// `expo prebuild` regenerates the Podfile and would drop a hand-edited hook.
const HOOK = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || current.to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end

    fmt_base_h = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base_h)
      src = File.read(fmt_base_h)
      patched = src.gsub(/^#  define FMT_USE_CONSTEVAL 1$/, '#  define FMT_USE_CONSTEVAL 0')
      if patched != src
        mode = File.stat(fmt_base_h).mode & 0o7777
        File.chmod(0o644, fmt_base_h)
        File.write(fmt_base_h, patched)
        File.chmod(mode, fmt_base_h)
      end
    end
`;

module.exports = function withIosBuildFixes(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(podfile, 'utf8');

      if (contents.includes(MARKER)) return cfg;

      const anchor = /post_install do \|installer\|\n/;
      if (!anchor.test(contents)) {
        throw new Error('withIosBuildFixes: no post_install block found in the Podfile');
      }

      fs.writeFileSync(podfile, contents.replace(anchor, (m) => m + HOOK));
      return cfg;
    },
  ]);
};
