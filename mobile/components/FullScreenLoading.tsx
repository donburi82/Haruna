import React from 'react';
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const wp = (pct: number) => (width * pct) / 100;
const hp = (pct: number) => (height * pct) / 100;
const rf = (size: number) => size * (width / 375);

interface FullScreenLoadingProps {
  label?: string;
}

export function FullScreenLoading({ label = 'Loading...' }: FullScreenLoadingProps) {
  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen gradient background */}
      <LinearGradient
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
        colors={['#F4FDDF', '#FEE6D4', '#F4FDDF']}
        locations={[0, 0.3942, 1]}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* clouds */}
          <Image
            source={require('../assets/images/cloud_left.png')}
            style={styles.cloudTopLeft}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/cloud_right.png')}
            style={styles.cloudBottomRight}
            resizeMode="contain"
          />

          {/* centered text */}
          <Text style={styles.loadingText}>{label}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    justifyContent: 'center',   // centers "Loading..."
    alignItems: 'center',
  },
  loadingText: {
    fontSize: rf(32),
    color: '#767676',
  },

  cloudTopLeft: {
    position: 'absolute',
    width: wp(80),
    aspectRatio: 1,
    top: hp(8),
    left: -wp(20),
  },
  cloudBottomRight: {
    position: 'absolute',
    width: wp(80),
    aspectRatio: 1,
    bottom: hp(8),
    right: -wp(20),
  },
});
