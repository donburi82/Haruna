import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const wp = (pct: number) => (width * pct) / 100;   // width percentage
const hp = (pct: number) => (height * pct) / 100;  // height percentage
const rf = (size: number) => size * (width / 375); // responsive font baseline 375px

const INITIAL_OFFSET = hp(8);
const FINAL_OFFSET = -hp(8);

export default function LandingOnboardingScreen() {
  const router = useRouter();

  const headerTranslateY = useRef(new Animated.Value(INITIAL_OFFSET)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(20)).current;

  // Auto-navigation after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/home');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);
  
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     Animated.sequence([
  //       // move header up
  //       Animated.timing(headerTranslateY, {
  //         toValue: FINAL_OFFSET,
  //         duration: 700,
  //         easing: Easing.out(Easing.cubic),
  //         useNativeDriver: true,
  //       }),
  //       // then show buttons
  //       Animated.parallel([
  //         Animated.timing(buttonsOpacity, {
  //           toValue: 1,
  //           duration: 400,
  //           useNativeDriver: true,
  //         }),
  //         Animated.timing(buttonsTranslateY, {
  //           toValue: 0,
  //           duration: 400,
  //           easing: Easing.out(Easing.cubic),
  //           useNativeDriver: true,
  //         }),
  //       ]),
  //     ]).start();
  //   }, 2500);

  //   return () => clearTimeout(timer);
  // }, [headerTranslateY, buttonsOpacity, buttonsTranslateY]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Haruna + logo block (starts centred) */}
        <Animated.View
          style={[
            styles.header,
            { transform: [{ translateY: headerTranslateY }] },
          ]}
        >
          <Text style={styles.title}>Haruna</Text>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Buttons (fade + slide in) */}
        <Animated.View
          style={[
            styles.bottomButtons,
            {
              opacity: buttonsOpacity,
              transform: [{ translateY: buttonsTranslateY }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.signupText}>Sign up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => {}}
          >
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4FDDF', // light pastel background
  },
  container: {
    flex: 1,
    justifyContent: 'center', // centre header vertically at start
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
  },

  title: {
    fontSize: rf(32),
    marginBottom: hp(3),
    color: '#25D0C2',
  },
  logo: {
    width: wp(24),
    aspectRatio: 1,
    marginBottom: hp(15),
  },

  // Hidden initially, animated in
  bottomButtons: {
    width: '100%',
    paddingHorizontal: wp(8),
    position: 'absolute',
    bottom: hp(10),
  },
  signupBtn: {
    backgroundColor: '#1AA958',
    paddingVertical: hp(2),
    borderRadius: 50,
    marginBottom: hp(2),
  },
  signupText: {
    textAlign: 'center',
    fontSize: rf(14),
    color: 'white',
  },
  loginBtn: {
    borderWidth: 2,
    borderColor: '#1AA958',
    paddingVertical: hp(2),
    borderRadius: 50,
  },
  loginText: {
    textAlign: 'center',
    fontSize: rf(14),
    color: '#1AA958',
  },
});
