import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const wp = (pct: number) => (width * pct) / 100;
const hp = (pct: number) => (height * pct) / 100;
const rf = (size: number) => size * (width / 375);

export default function SignupScreen() {
  const router = useRouter();

  const toIsoDate = (d: Date | null): string | null => {
    if (!d) return null;
    return d.toISOString().split('T')[0];
  };
  const buildSignupPayload = () => ({
    account: {
      nickname,
      email,
      password,
    },
    profile: {
      gender,
      dob: toIsoDate(dobDate),
      allergies: allergy,
      dietaryPreference: dietPreference,
      otherOption: otherOption,
    },
    goal: {
      goalType: goal,
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
    },
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const goNext = async () => {
    if (step < 3) {
      setStep((prev) => ((prev + 1) as 1 | 2 | 3));
      return ;
    }

    router.push({
      pathname: '/loadingSignup',
      params: { payload: JSON.stringify(buildSignupPayload()) }
    });
  };
  const goBack = () => {
    if (step > 1) setStep((prev) => (prev - 1) as 1 | 2 | 3);
  };

  // Step 1
  type Gender = 'Male' | 'Female' | 'Prefer Not to Say';

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const [gender, setGender] = useState<Gender | ''>('');
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [tempDobDate, setTempDobDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dobDisplay = dobDate
    ? `${String(dobDate.getMonth() + 1).padStart(2, '0')}/${String(
        dobDate.getDate()
      ).padStart(2, '0')}/${dobDate.getFullYear()}`
    : 'MM/DD/YYYY';

  const validateEmail = (value: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(value.toLowerCase());
  };

  const handleEmailBlur = () => {
    if (!email) {
      setEmailError(null);
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError(null);
    }
  };

  const handleConfirmPasswordBlur = () => {
    // If empty, don’t show error
    if (!confirmPassword) {
      setConfirmPasswordError(null);
      return;
    }

    // Only show error if both fields have values and differ
    if (password && confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match.');
    } else {
      setConfirmPasswordError(null);
    }
  };

  const isStep1Valid =
    nickname.trim().length > 0 &&
    password.trim().length > 0 &&
    email.trim().length > 0 &&
    validateEmail(email) &&
    !!gender &&
    !!dobDate;

  // Step 2
  type GoalOption =
  | 'Weight management'
  | 'Strength building'
  | 'Nutrition management'
  | 'Inflammatory control'
  | 'Immunity boosting'
  | 'Skincare';

  const [goal, setGoal] = useState<GoalOption | ''>('');
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // iOS temp values while scrolling picker
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // display strings
  const startDateDisplay = startDate
    ? `${String(startDate.getMonth() + 1).padStart(2, '0')}/${String(
        startDate.getDate()
      ).padStart(2, '0')}/${startDate.getFullYear()}`
    : 'Start date';

  const endDateDisplay = endDate
    ? `${String(endDate.getMonth() + 1).padStart(2, '0')}/${String(
        endDate.getDate()
      ).padStart(2, '0')}/${endDate.getFullYear()}`
    : 'End date';
  
  const msPerDay = 1000 * 60 * 60 * 24;

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
  };
    
  // minimum end date = (start or today) + 7 days
  const minEndDate = React.useMemo(() => {
    const base = startDate ?? today;
    return addDays(base, 7);
  }, [startDate, today]);


  const formatDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // Preview duration while user is scrolling the end-date wheel on iOS
  const tempEndDurationDays = React.useMemo(() => {
    const msPerDay = 1000 * 60 * 60 * 24;
    if (!tempEndDate && !endDate) return 0;
    const baseStart = startDate ?? today;
    const end = (tempEndDate ?? endDate ?? minEndDate);
    return Math.round((end.getTime() - baseStart.getTime()) / msPerDay)+1;
  }, [tempEndDate, endDate, startDate, today, minEndDate]);

  // Step 2 validation (goal + both dates + duration >= 7 days)
  const step2DurationDays =
    startDate && endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)
      : 0;

  const isStep2Valid =
    !!goal && !!startDate && !!endDate && step2DurationDays >= 7;

  
  // Step 3
  type AllergyOption =
    | 'N/A'
    | 'Gluten-free'
    | 'Peanut allergy'
    | 'Tree nut allergy'
    | 'Dairy-free / Lactose intolerance'
    | 'Egg allergy'
    | 'Soy allergy'
    | 'Shellfish allergy'
    | 'Wheat allergy'
    | 'Peach allergy / Stone fruit allergy'
    | 'Fish allergy';

  type DietaryPreferenceOption =
    | 'N/A'
    | 'Vegetarian'
    | 'Vegan'
    | 'Pescatarian'
    | 'Kosher'
    | 'Halal'
    | 'Low FODMAP'
    | 'Keto / Low-carb'
    | 'Diabetic-friendly'
    | 'Low-sodium'
    | 'High-protein';

  type OtherOption =
    | 'N/A'
    | 'Caffeine-free'
    | 'Sugar-free'
    | 'No added sugar';

  const ALLERGY_OPTIONS: AllergyOption[] = [
    'N/A',
    'Gluten-free',
    'Peanut allergy',
    'Tree nut allergy',
    'Dairy-free / Lactose intolerance',
    'Egg allergy',
    'Soy allergy',
    'Shellfish allergy',
    'Wheat allergy',
    'Peach allergy / Stone fruit allergy',
    'Fish allergy',
  ];

  const DIET_OPTIONS: DietaryPreferenceOption[] = [
    'N/A',
    'Vegetarian',
    'Vegan',
    'Pescatarian',
    'Kosher',
    'Halal',
    'Low FODMAP',
    'Keto / Low-carb',
    'Diabetic-friendly',
    'Low-sodium',
    'High-protein',
  ];

  const OTHER_OPTIONS: OtherOption[] = [
    'N/A',
    'Caffeine-free',
    'Sugar-free',
    'No added sugar',
  ];

  const [allergy, setAllergy] = useState<AllergyOption | ''>('');
  const [dietPreference, setDietPreference] = useState<DietaryPreferenceOption | ''>('');
  const [otherOption, setOtherOption] = useState<OtherOption | ''>('');

  const [allergyModalVisible, setAllergyModalVisible] = useState(false);
  const [dietModalVisible, setDietModalVisible] = useState(false);
  const [otherModalVisible, setOtherModalVisible] = useState(false);

  const isStep3Valid = !!allergy && !!dietPreference && !!otherOption;

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" style="dark" />

      {/* Root container */}
      <View style={{ flex: 1 }}>
        {/* Full-screen gradient background */}
        <LinearGradient
          pointerEvents="none"
          style={StyleSheet.absoluteFillObject}
          colors={['#F4FDDF', '#FEE6D4', '#F4FDDF']}
          locations={[0, 0.3942, 1]}
        />
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                >
                {/* Step indicator */}
                <View style={styles.stepContainer}>
                    {[1, 2, 3].map((s) => (
                    <View
                        key={s}
                        style={[
                        styles.stepBar,
                        s <= step ? styles.stepBarActive : styles.stepBarInactive,
                        ]}
                    />
                    ))}
                </View>

                <Text style={styles.title}>Welcome to Haruna</Text>

                {/* You can place logo here if you want */}
                <Image source={require('../assets/images/logo-partial.png')} style={styles.logo} />

                {/* Step content */}
                {/* Step 1 */}
                {step === 1 && (
                  <View style={styles.formContainer}>
                    {/* Nickname */}
                    <TextInput
                      style={styles.input}
                      placeholder="Nickname"
                      value={nickname}
                      onChangeText={setNickname}
                      placeholderTextColor="#767676"
                    />

                    {/* Email with validation */}
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (emailError) setEmailError(null);
                      }}
                      onEndEditing={handleEmailBlur}
                      placeholderTextColor="#767676"
                    />
                    {emailError && (
                      <Text style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>
                        {emailError}
                      </Text>
                    )}

                    {/* Password */}
                    <View style={[styles.input, styles.passwordContainer]}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Password"
                        secureTextEntry={!isPasswordVisible}
                        value={password}
                        onChangeText={setPassword}
                        placeholderTextColor="#767676"
                      />
                      <TouchableOpacity
                        onPress={() => setIsPasswordVisible((prev) => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline' }
                          size={20}
                          color="#767676"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Confirm Password */}
                    <View style={[styles.input, styles.passwordContainer]}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Confirm Password"
                        secureTextEntry={!isConfirmPasswordVisible}
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (confirmPasswordError) setConfirmPasswordError(null);
                        }}
                        onEndEditing={handleConfirmPasswordBlur}
                        placeholderTextColor="#767676"
                      />
                      <TouchableOpacity
                        onPress={() => setIsConfirmPasswordVisible(prev => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={isConfirmPasswordVisible ? 'eye-outline' : 'eye-off-outline' }
                          size={20}
                          color="#767676"
                        />
                      </TouchableOpacity>
                    </View>
                    {confirmPasswordError && (
                      <Text style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>
                        {confirmPasswordError}
                      </Text>
                    )}

                    {/* Gender – custom dropdown */}
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownContainer]}
                      activeOpacity={0.8}
                      onPress={() => setGenderModalVisible(true)}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: gender ? '#000' : '#767676',
                        }}
                      >
                        {gender || 'Gender'}
                      </Text>

                      <Ionicons
                        name="chevron-down-outline"
                        size={20}
                        color="#767676"
                      />
                    </TouchableOpacity>

                    {/* Date of birth – calendar picker */}
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownContainer]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          setTempDobDate(dobDate ?? new Date(2000, 0, 1));
                        }
                        setShowDatePicker(true);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: dobDate ? '#000' : '#767676',
                        }}
                      >
                        {dobDisplay}
                      </Text>
                      <Ionicons
                        name="chevron-down-outline"
                        size={20}
                        color="#767676"
                      />
                    </TouchableOpacity>

                    {/* ANDROID date picker (inline) */}
                    {showDatePicker && Platform.OS === 'android' && (
                      <DateTimePicker
                        value={dobDate ?? new Date(2000, 0, 1)}
                        mode="date"
                        display="default"
                        onChange={(_, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) setDobDate(selectedDate);
                        }}
                        maximumDate={new Date()}
                      />
                    )}

                    {/* iOS date picker (bottom sheet with Confirm/Cancel) */}
                    {showDatePicker && Platform.OS === 'ios' && (
                      <Modal
                        transparent
                        animationType="fade"
                        visible={showDatePicker}
                        onRequestClose={() => setShowDatePicker(false)}
                      >
                        <Pressable
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            justifyContent: 'flex-end',
                          }}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <View
                            style={{
                              backgroundColor: '#fff',
                              borderTopLeftRadius: 16,
                              borderTopRightRadius: 16,
                              paddingBottom: 16,
                            }}
                          >
                            {/* Toolbar */}
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingTop: 12,
                                paddingBottom: 4,
                              }}
                            >
                              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                <Text style={{ fontSize: 16, color: '#888' }}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setDobDate(tempDobDate);
                                  setShowDatePicker(false);
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 16,
                                    color: '#1AA958',
                                    fontWeight: '600',
                                  }}
                                >
                                  Confirm
                                </Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.iosPickerContainer}>
                              <DateTimePicker
                                value={tempDobDate}
                                mode="date"
                                display="spinner"
                                onChange={(_, selectedDate) => {
                                  if (selectedDate) setTempDobDate(selectedDate);
                                }}
                                maximumDate={new Date()}
                                themeVariant="light"
                                textColor="#000"
                                style={styles.iosPicker}
                              />
                            </View>
                          </View>
                        </Pressable>
                      </Modal>
                    )}

                    {/* Gender selection modal – same on iOS & Android */}
                    <Modal
                      transparent
                      visible={genderModalVisible}
                      animationType="fade"
                      onRequestClose={() => setGenderModalVisible(false)}
                    >
                      <Pressable
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setGenderModalVisible(false)}
                      >
                        <View
                          style={{
                            width: '80%',
                            backgroundColor: 'white',
                            borderRadius: 16,
                            paddingVertical: 16,
                          }}
                        >
                          {(['Male', 'Female', 'Prefer Not to Say'] as Gender[]).map((g) => (
                            <Pressable
                              key={g}
                              onPress={() => {
                                setGender(g);
                                setGenderModalVisible(false);
                              }}
                              style={{ paddingVertical: 12, paddingHorizontal: 20 }}
                            >
                              <Text style={{ fontSize: 16 }}>{g}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </Pressable>
                    </Modal>
                  </View>
                )}



                {step === 2 && (
                  <View style={styles.formContainer}>
                    {/* Goals dropdown */}
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownContainer]}
                      activeOpacity={0.8}
                      onPress={() => setGoalModalVisible(true)}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: goal ? '#000' : '#767676',
                        }}
                      >
                        {goal || 'Goals to achieve'}
                      </Text>
                      <Ionicons
                        name="chevron-down-outline"
                        size={20}
                        color="#767676"
                      />
                    </TouchableOpacity>

                    {/* Timeframe: start date */}
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownContainer]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          const base = startDate && startDate >= today ? startDate : today;
                          setTempStartDate(base);
                        }
                        setShowStartPicker(true);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: startDate ? '#000' : '#767676',
                        }}
                      >
                        {startDateDisplay}
                      </Text>
                      <Ionicons
                        name="chevron-down-outline"
                        size={20}
                        color="#767676"
                      />
                    </TouchableOpacity>

                    {/* Timeframe: end date */}
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownContainer]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          // default end: existing end if valid, otherwise minEndDate
                          const base =
                            endDate && endDate >= minEndDate ? endDate : minEndDate;
                          setTempEndDate(base);
                        }
                        setShowEndPicker(true);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: endDate ? '#000' : '#767676',
                        }}
                      >
                        {endDateDisplay}
                      </Text>
                      <Ionicons
                        name="chevron-down-outline"
                        size={20}
                        color="#767676"
                      />
                    </TouchableOpacity>

                    {/* Only show duration message if both dates set */}
                    {startDate && endDate && step2DurationDays < 7 && (
                      <Text style={{ fontSize: 12, color: 'red', marginBottom: 8 }}>
                        Please choose a period of at least 7 days.
                      </Text>
                    )}

                    {/* ANDROID start date picker */}
                    {showStartPicker && Platform.OS === 'android' && (
                      <DateTimePicker
                        value={startDate && startDate >= today ? startDate : today}
                        mode="date"
                        display="default"
                        onChange={(_, selectedDate) => {
                          setShowStartPicker(false);
                          if (selectedDate) {
                            // clamp to today if somehow earlier
                            const clipped =
                              selectedDate >= today ? selectedDate : today;
                            clipped.setHours(0, 0, 0, 0);
                            setStartDate(clipped);

                            // adjust end date if now violating minEndDate
                            if (endDate && endDate < addDays(clipped, 7)) {
                              setEndDate(addDays(clipped, 7));
                            }
                          }
                        }}
                        minimumDate={today}
                      />
                    )}

                    {/* ANDROID end date picker */}
                    {showEndPicker && Platform.OS === 'android' && (
                      <DateTimePicker
                        value={
                          endDate && endDate >= minEndDate ? endDate : minEndDate
                        }
                        mode="date"
                        display="default"
                        onChange={(_, selectedDate) => {
                          setShowEndPicker(false);
                          if (selectedDate) {
                            const clipped =
                              selectedDate >= minEndDate ? selectedDate : minEndDate;
                            clipped.setHours(0, 0, 0, 0);
                            setEndDate(clipped);
                          }
                        }}
                        minimumDate={minEndDate}
                      />
                    )}

                    {/* iOS start date picker – bottom sheet with confirm */}
                    {showStartPicker && Platform.OS === 'ios' && (
                      <Modal
                        transparent
                        animationType="fade"
                        visible={showStartPicker}
                        onRequestClose={() => setShowStartPicker(false)}
                      >
                        <Pressable
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            justifyContent: 'flex-end',
                          }}
                          onPress={() => setShowStartPicker(false)}
                        >
                          <View
                            style={{
                              backgroundColor: '#fff',
                              borderTopLeftRadius: 16,
                              borderTopRightRadius: 16,
                              paddingBottom: 16,
                            }}
                          >
                            {/* Toolbar */}
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingTop: 12,
                                paddingBottom: 4,
                              }}
                            >
                              <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                                <Text style={{ fontSize: 16, color: '#888' }}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  const base = tempStartDate ?? today;
                                  const clipped =
                                    base >= today ? base : today;
                                  clipped.setHours(0, 0, 0, 0);
                                  setStartDate(clipped);

                                  // If existing endDate is now too early, shift it
                                  if (endDate && endDate < addDays(clipped, 7)) {
                                    setEndDate(addDays(clipped, 7));
                                  }

                                  setShowStartPicker(false);
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 16,
                                    color: '#1AA958',
                                    fontWeight: '600',
                                  }}
                                >
                                  Confirm
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* NEW — helper text for iOS start date */}
                            <View style={styles.iosPickerInfo}>
                              <Text style={styles.iosPickerInfoText}>
                                Earliest allowed start date: {formatDate(today)}
                              </Text>
                            </View>

                            <View style={styles.iosPickerContainer}>
                              <DateTimePicker
                                value={tempStartDate ?? today}
                                mode="date"
                                display="spinner"
                                onChange={(_, selectedDate) => {
                                  if (selectedDate) {
                                    const clipped =
                                      selectedDate >= today ? selectedDate : today;
                                    clipped.setHours(0, 0, 0, 0);
                                    setTempStartDate(clipped);
                                  }
                                }}
                                minimumDate={today}
                                themeVariant="light"
                                textColor="#000"
                                style={styles.iosPicker}
                              />
                            </View>
                          </View>
                        </Pressable>
                      </Modal>
                    )}

                    {/* iOS end date picker – bottom sheet with confirm */}
                    {showEndPicker && Platform.OS === 'ios' && (
                      <Modal
                        transparent
                        animationType="fade"
                        visible={showEndPicker}
                        onRequestClose={() => setShowEndPicker(false)}
                      >
                        <Pressable
                          style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            justifyContent: 'flex-end',
                          }}
                          onPress={() => setShowEndPicker(false)}
                        >
                          <View
                            style={{
                              backgroundColor: '#fff',
                              borderTopLeftRadius: 16,
                              borderTopRightRadius: 16,
                              paddingBottom: 16,
                            }}
                          >
                            {/* Toolbar */}
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingTop: 12,
                                paddingBottom: 4,
                              }}
                            >
                              <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                                <Text style={{ fontSize: 16, color: '#888' }}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  const base = tempEndDate ?? minEndDate;
                                  const clipped = base >= minEndDate ? base : minEndDate;
                                  clipped.setHours(0, 0, 0, 0);
                                  setEndDate(clipped);
                                  setShowEndPicker(false);
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 16,
                                    color: '#1AA958',
                                    fontWeight: '600',
                                  }}
                                >
                                  Confirm
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* NEW: helper text explaining viable options */}
                            <View style={styles.iosPickerInfo}>
                              <Text style={styles.iosPickerInfoText}>
                                Earliest end date: {formatDate(minEndDate)}
                              </Text>
                              {startDate && (
                                <Text style={styles.iosPickerInfoText}>
                                  Current duration: {Math.max(tempEndDurationDays, 0)} days
                                </Text>
                              )}
                            </View>

                            <View style={styles.iosPickerContainer}>
                              <DateTimePicker
                                value={tempEndDate ?? minEndDate}
                                mode="date"
                                display="spinner"
                                onChange={(_, selectedDate) => {
                                  if (selectedDate) {
                                    const clipped =
                                      selectedDate >= minEndDate ? selectedDate : minEndDate;
                                    clipped.setHours(0, 0, 0, 0);
                                    setTempEndDate(clipped);
                                  }
                                }}
                                minimumDate={minEndDate}
                                themeVariant="light"
                                textColor="#000"
                                style={styles.iosPicker}
                              />
                            </View>
                          </View>
                        </Pressable>
                      </Modal>
                    )}


                    {/* Goals selection modal */}
                    <Modal
                      transparent
                      visible={goalModalVisible}
                      animationType="fade"
                      onRequestClose={() => setGoalModalVisible(false)}
                    >
                      <Pressable
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setGoalModalVisible(false)}
                      >
                        <View
                          style={{
                            width: '80%',
                            backgroundColor: 'white',
                            borderRadius: 16,
                            paddingVertical: 16,
                          }}
                        >
                          {([
                            'Weight management',
                            'Strength building',
                            'Nutrition management',
                            'Inflammatory control',
                            'Immunity boosting',
                            'Skincare',
                          ] as GoalOption[]).map((g) => (
                            <Pressable
                              key={g}
                              onPress={() => {
                                setGoal(g);
                                setGoalModalVisible(false);
                              }}
                              style={{ paddingVertical: 12, paddingHorizontal: 20 }}
                            >
                              <Text style={{ fontSize: 16 }}>{g}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </Pressable>
                    </Modal>
                  </View>
                )}



                {step === 3 && (
                  <View style={styles.formContainer}>
                    {/* Allergies */}
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownContainer]}
                      activeOpacity={0.8}
                      onPress={() => setAllergyModalVisible(true)}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: allergy ? '#000' : '#767676',
                        }}
                      >
                        {allergy || 'Allergies'}
                      </Text>
                      <Ionicons
                        name="chevron-down-outline"
                        size={20}
                        color="#767676"
                      />
                    </TouchableOpacity>

                    {/* Dietary Preferences */}
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownContainer]}
                      activeOpacity={0.8}
                      onPress={() => setDietModalVisible(true)}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: dietPreference ? '#000' : '#767676',
                        }}
                      >
                        {dietPreference || 'Dietary Preferences'}
                      </Text>
                      <Ionicons
                        name="chevron-down-outline"
                        size={20}
                        color="#767676"
                      />
                    </TouchableOpacity>

                    {/* Other options */}
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownContainer]}
                      activeOpacity={0.8}
                      onPress={() => setOtherModalVisible(true)}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: otherOption ? '#000' : '#767676',
                        }}
                      >
                        {otherOption || 'Other options'}
                      </Text>
                      <Ionicons
                        name="chevron-down-outline"
                        size={20}
                        color="#767676"
                      />
                    </TouchableOpacity>

                    {/* Allergies modal */}
                    <Modal
                      transparent
                      visible={allergyModalVisible}
                      animationType="fade"
                      onRequestClose={() => setAllergyModalVisible(false)}
                    >
                      <Pressable
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setAllergyModalVisible(false)}
                      >
                        <View
                          style={{
                            width: '80%',
                            backgroundColor: 'white',
                            borderRadius: 16,
                            paddingVertical: 16,
                          }}
                        >
                          {ALLERGY_OPTIONS.map((opt) => (
                            <Pressable
                              key={opt}
                              onPress={() => {
                                setAllergy(opt);
                                setAllergyModalVisible(false);
                              }}
                              style={{ paddingVertical: 12, paddingHorizontal: 20 }}
                            >
                              <Text style={{ fontSize: 16 }}>{opt}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </Pressable>
                    </Modal>

                    {/* Dietary preferences modal */}
                    <Modal
                      transparent
                      visible={dietModalVisible}
                      animationType="fade"
                      onRequestClose={() => setDietModalVisible(false)}
                    >
                      <Pressable
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setDietModalVisible(false)}
                      >
                        <View
                          style={{
                            width: '80%',
                            backgroundColor: 'white',
                            borderRadius: 16,
                            paddingVertical: 16,
                          }}
                        >
                          {DIET_OPTIONS.map((opt) => (
                            <Pressable
                              key={opt}
                              onPress={() => {
                                setDietPreference(opt);
                                setDietModalVisible(false);
                              }}
                              style={{ paddingVertical: 12, paddingHorizontal: 20 }}
                            >
                              <Text style={{ fontSize: 16 }}>{opt}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </Pressable>
                    </Modal>

                    {/* Other options modal */}
                    <Modal
                      transparent
                      visible={otherModalVisible}
                      animationType="fade"
                      onRequestClose={() => setOtherModalVisible(false)}
                    >
                      <Pressable
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setOtherModalVisible(false)}
                      >
                        <View
                          style={{
                            width: '80%',
                            backgroundColor: 'white',
                            borderRadius: 16,
                            paddingVertical: 16,
                          }}
                        >
                          {OTHER_OPTIONS.map((opt) => (
                            <Pressable
                              key={opt}
                              onPress={() => {
                                setOtherOption(opt);
                                setOtherModalVisible(false);
                              }}
                              style={{ paddingVertical: 12, paddingHorizontal: 20 }}
                            >
                              <Text style={{ fontSize: 16 }}>{opt}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </Pressable>
                    </Modal>
                  </View>
                )}

                {/* Buttons */}
                <View style={styles.buttonBlock}>
                    {step > 1 && (
                    <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={goNext}
                      disabled={
                        (step === 1 && !isStep1Valid) ||
                        (step === 2 && !isStep2Valid) ||
                        (step === 3 && !isStep3Valid)
                      }
                      style={[
                        styles.primaryBtn,
                        ((step === 1 && !isStep1Valid) ||
                          (step === 2 && !isStep2Valid) ||
                          (step === 3 && !isStep3Valid)) &&
                          styles.primaryBtnDisabled,
                      ]}
                    >
                      <Text style={styles.primaryText}>
                        {step < 3 ? 'Continue' : 'Finish'}
                      </Text>
                    </TouchableOpacity>
                </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradient: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: wp(8),
    paddingTop: hp(4),
    paddingBottom: hp(4),
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(3),
  },
  stepBar: {
    flex: 1,
    height: hp(0.9),
    borderRadius: hp(0.5),
    marginHorizontal: wp(1.2),
  },
  stepBarActive: {
    backgroundColor: '#90C4FB',
  },
  stepBarInactive: {
    backgroundColor: '#C4C4C4',
  },
  title: {
    fontSize: rf(22),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: hp(3),
    color: '#252525',
  },
  formContainer: {
    marginBottom: hp(3),
  },
  stepLabel: {
    fontSize: rf(15),
    marginBottom: hp(2),
    color: '#555555',
  },
  input: {
    height: hp(6.2),
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp(5),
    marginBottom: hp(1.7),
    fontSize: rf(14),
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,

    // NEW – helps center TextInput vertically, esp. on Android
    textAlignVertical: 'center',
    paddingVertical: 0,
  },
  // NEW – for touchable “inputs” (Gender, DOB)
  touchableInput: {
    justifyContent: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',  // pushes icon to the right
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 0,
  },
  termsText: {
    fontSize: rf(11),
    color: '#000',
    marginBottom: hp(3),
  },
  termsLink: {
    color: '#94C51F',
  },
  buttonBlock: {
    marginTop: hp(1),
  },

  primaryBtn: {
    backgroundColor: '#1AA958',
    paddingVertical: hp(1.9),
    borderRadius: 50,
  },
  primaryText: {
    textAlign: 'center',
    fontSize: rf(16),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  primaryBtnDisabled: {
    backgroundColor: '#C4C4C4',
  },

  backBtn: {
    marginBottom: hp(1.5),
  },
  backText: {
    textAlign: 'center',
    fontSize: rf(14),
    color: '#767676',
  },
  logo: {
    width: wp(4),        // responsive width
    aspectRatio: 1,      // keeps logo square and responsive
  },

  iosPickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  iosPicker: {
    height: 220,
  },
  iosPickerInfo: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  iosPickerInfoText: {
    fontSize: 12,
    color: '#555',
  },
});
