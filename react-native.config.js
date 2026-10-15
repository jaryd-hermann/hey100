module.exports = {
  dependencies: {
    // Transitive deps declare Reanimated; autolinking then forces it to compile
    // even though nothing imports it. Animations here use RN's Animated.
    'react-native-reanimated': {
      platforms: { ios: null, android: null },
    },
  },
};
