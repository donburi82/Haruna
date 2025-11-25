// app/home.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/lib/api';
import { FullScreenLoading } from '../components/FullScreenLoading';

const { width, height } = Dimensions.get('window');

const wp = (pct: number) => (width * pct) / 100;   // width percentage
const hp = (pct: number) => (height * pct) / 100;  // height percentage
const rf = (size: number) => size * (width / 375); // responsive font baseline 375px

type TabKey = 'home' | 'calendar' | 'reward' | 'setting';

// For Home
type MissionKey = 'mission1' | 'mission2';

interface TodayMission {
  id: string;
  text: string;
  completed: boolean;
}

interface TodayData {
  date: string;
  mission1: TodayMission;
  mission2: TodayMission;

  moodSubmitted?: boolean;
  mood?: string | null;
}

interface WeeklyStatusItem {
  date: string;      // ISO string
  complete: boolean; // true if both missions completed and day <= today
}

interface GoalData {
  goalId: string;
  goalType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  daysLeft: number;
}

// Screen
export default function HomeScreen() {
  const tokenRef = React.useRef<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabKey>('home');

  const [selectedMood, setSelectedMood] = React.useState<string | null>(null);
  const [moodSubmitted, setMoodSubmitted] = React.useState(false);
  const [moodPopupVisible, setMoodPopupVisible] = React.useState(false);

  const [nickname, setNickname] = React.useState<string>('');      // Jacky Choi -> from API
  const [points, setPoints] = React.useState<number>(0);           // reward points
  const [goal, setGoal] = React.useState<GoalData | null>(null);   // current goal
  const [weeklyStatus, setWeeklyStatus] = React.useState<WeeklyStatusItem[]>([]);
  const [todayData, setTodayData] = React.useState<TodayData | null>(null);

  const [goalChecks, setGoalChecks] = React.useState<Record<MissionKey, boolean>>({
    mission1: false,
    mission2: false,
  });

  const [loading, setLoading] = React.useState<boolean>(true);

  const [doneLoading, setDoneLoading] = React.useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = React.useState(false);
  const [rewardModalVisible, setRewardModalVisible] = React.useState(false);
  const [earnedPoints, setEarnedPoints] = React.useState(0);

  // ---- Fetch /missions/home on mount ----
  React.useEffect(() => {
    const fetchHomeData = async () => {
      try {
        tokenRef.current = await SecureStore.getItemAsync('authToken');
        if (!tokenRef.current) {
          console.warn('No auth token found');
          setLoading(false);
          return;
        }

        const res = await api('/home', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
          }
        });

        const data = await res.json().catch(() => null);

        setNickname(data.nickname ?? '');
        setPoints(data.points ?? 0);
        setGoal(data.goal ?? null);
        setWeeklyStatus(Array.isArray(data.weeklyStatus) ? data.weeklyStatus : []);
        setTodayData(data.today ?? null);

        // initialise mission checkboxes from today's completion status
        if (data.today) {
          const m1Done = !!data.today.mission1?.completed;
          const m2Done = !!data.today.mission2?.completed;

          setGoalChecks({
            mission1: m1Done,
            mission2: m2Done,
          });

          // if both missions already completed, lock everything
          if (m1Done && m2Done) {
            setAlreadySubmitted(true);
          }

          const submittedMoodToday = !!data.today.moodSubmitted;
          setMoodSubmitted(submittedMoodToday);

          if (submittedMoodToday && data.today.mood) {
            setSelectedMood(data.today.mood);
          }
        } else {
          setGoalChecks({ mission1: false, mission2: false });
          setAlreadySubmitted(false);
          setMoodSubmitted(false);
          setSelectedMood(null);
        }
      } catch (err) {
        console.error('Error fetching /missions/home', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // missions array: built from today's missions
  const missions: { key: MissionKey; label: string; id: string }[] = React.useMemo(() => {
    if (!todayData) return [];
    return [
      { key: 'mission1', label: todayData.mission1.text, id: todayData.mission1.id },
      { key: 'mission2', label: todayData.mission2.text, id: todayData.mission2.id },
    ];
  }, [todayData]);
  // console.log(missions);

  const allMissionsChecked =
    missions.length > 0 &&
    missions.every((m) => m.id && goalChecks[m.key] === true);
  
  const doneButtonEnabled =
    !alreadySubmitted &&
    !doneLoading &&
    allMissionsChecked;
  
  const handleDonePress = async () => {
    if (!allMissionsChecked) return;

    const missionIds = missions
      .map((m) => m.id)
      .filter((id): id is string => !!id);
    console.log(missionIds);

    if (missionIds.length === 0) return;

    try {
      setDoneLoading(true);

      const res = await api('/home/complete', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({missionIds: missionIds}),
      });

      const data = await res.json().catch(() => null);

      // update total points from backend
      if (typeof data.totalPoints === 'number') {
        setPoints(data.totalPoints);
      }

      // ensure local completion state is true
      setGoalChecks({ mission1: true, mission2: true });

      // optionally update todayData as well
      setTodayData((prev) =>
        prev
          ? {
              ...prev,
              mission1: prev.mission1
                ? { ...prev.mission1, completed: true }
                : prev.mission1,
              mission2: prev.mission2
                ? { ...prev.mission2, completed: true }
                : prev.mission2,
            }
          : prev
      );

      // show reward popup
      setEarnedPoints(data.earnedPoints || 0);
      setRewardModalVisible(true);
      setAlreadySubmitted(true);
    } catch (err) {
      console.error('Error completing missions', err);
    } finally {
      setDoneLoading(false);
    }
  };

  const [moodLoading, setMoodLoading] = React.useState(false);

  const handleMoodPress = async (moodLabel: string) => {
    // prevent multiple submissions or changes after submit
    if (moodSubmitted || moodLoading || selectedMood) return;

    setSelectedMood(moodLabel);

    try {
      setMoodLoading(true);

      const token = tokenRef.current || (await SecureStore.getItemAsync('authToken'));
      if (!token) {
        console.warn('No auth token for mood');
        setMoodLoading(false);
        return;
      }


      const res = await api('/home/mood', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({mood: moodLabel}),
      });

      if (!res.ok) {
        console.error('Failed to submit mood', res.status);
        setMoodLoading(false);
        return;
      }

      const data = await res.json().catch(() => null);
      // success – mark mood as submitted
      setMoodSubmitted(true);
      setMoodPopupVisible(true);
    } catch (err) {
      console.error('Error submitting mood', err);
    } finally {
      setMoodLoading(false);
    }
  };

  // weekly schedule helpers
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  // const todayIndex = new Date().getDay();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // progress bar: based on goal days elapsed vs totalDays (timeline progress)
  let progressPercent = 0;
  let daysLeftText = '';
  if (goal) {
    const totalDays = goal.totalDays || 1;
    const daysLeft = goal.daysLeft ?? 0;
    const daysCompleted = Math.max(totalDays - daysLeft, 0);
    progressPercent = Math.min(100, Math.max(0, (daysCompleted / totalDays) * 100));
    daysLeftText = `${daysLeft} days left`;
  }

  // To be Updated
  if (loading) {
    return <FullScreenLoading />;
  }

  const onTabPress = (tab: TabKey) => {
    setActiveTab(tab);
  };

  const renderHomeContent = () => (
    <>
      {/* Greeting text (centered) */}
      <View style={styles.greetingBox}>
        <Text style={styles.greetingText}>Good morning,</Text>
        <Text style={styles.greetingName}>{nickname || 'Guest'}</Text>
        <Text style={styles.greetingSub}>NOURISH YOURSELF –</Text>
        <Text style={styles.greetingSub}>YOU&apos;RE DOING AMAZING!</Text>
      </View>

      {/* Weekly schedule */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Weekly schedule</Text>
        </View>

        <View style={styles.weekRow}>
          {daysOfWeek.map((d, idx) => {
            const item = weeklyStatus[idx]; // backend gives 7 items (Sun–Sat)

            let displayText: string = '';
            let isToday = false;
            let isPast = false;
            let isComplete = false;

            if (item) {
              const dateObj = new Date(item.date);
              const dayDate = new Date(dateObj);
              dayDate.setHours(0, 0, 0, 0);

              const dayTime = dayDate.getTime();
              const todayTime = todayStart.getTime();

              isToday = dayTime === todayTime;
              isPast = dayTime < todayTime;
              isComplete = !!item.complete;

              if (isPast) {
                // past days: tick or cross
                displayText = isComplete ? '✓' : '✗';
              } else {
                // today + future: show date number
                displayText = String(dayDate.getDate());
              }
            } else {
              // fallback if weeklyStatus[idx] is missing:
              displayText = '';
            }

            return (
              <View key={d} style={styles.dayCell}>
                <Text
                  style={[
                    styles.dayLabel,
                    isToday && styles.dayLabelToday,
                  ]}
                >
                  {d}
                </Text>

                <Text
                  style={[
                    styles.dayNumber,
                    // past days: style based on ✓ / ✗
                    isPast && isComplete && styles.dayDone,
                    isPast && !isComplete && styles.dayMissed,
                    // today: special colour, but still shows date number
                    isToday && styles.dayTodayNumber,
                  ]}
                >
                  {displayText}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          {goal && (
            <Text style={styles.daysLeftText}>{daysLeftText}</Text>
          )}
        </View>
      </View>

      {/* Mood section */}
      {!moodSubmitted && (
        <View style={styles.section}>
          <View style={styles.moodCard}>
            <Text style={styles.sectionTitle}>How do you feel today?</Text>

            <View style={styles.moodRow}>
              {[
                { label: 'Good', img: require('../assets/images/good.png') },
                { label: 'Joyful', img: require('../assets/images/joyful.png') },
                { label: 'Sad', img: require('../assets/images/sad.png') },
                { label: 'Bored', img: require('../assets/images/bored.png') },
                { label: 'Angry', img: require('../assets/images/angry.png') },
              ].map((mood) => {
                const isSelected = selectedMood === mood.label;

                return (
                  <TouchableOpacity
                    key={mood.label}
                    style={[styles.moodItem, isSelected && styles.moodItemSelected]}
                    activeOpacity={0.7}
                    onPress={() => handleMoodPress(mood.label)}
                    disabled={moodSubmitted || moodLoading}
                  >
                    <Image source={mood.img} style={styles.moodIcon} />
                    <Text
                      style={[
                        styles.moodLabel,
                        isSelected && styles.moodLabelSelected,
                      ]}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Goal card */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{goal ? `Goal : ${goal.goalType}` : 'Goal'}</Text>
        </View>

        <LinearGradient
          colors={['#B6D9FF', '#7FDBD4']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.goalCard}
        >
          <View style={styles.goalTextRow}>
            {missions.length === 0 ? (
              <Text style={styles.goalText}>No missions for today yet.</Text>
            ) : (
              missions.map((item) => {
                const checkboxLocked = alreadySubmitted; // once submitted, never change

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.goalLine}
                    activeOpacity={checkboxLocked ? 1 : 0.7}
                    disabled={checkboxLocked}
                    onPress={() => {
                      if (checkboxLocked) return;
                      setGoalChecks((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key],
                      }));
                    }}
                  >
                    <View style={styles.goalTextWrapper}>
                      <Text style={styles.goalText}>{item.label}</Text>
                    </View>

                    <Ionicons
                      name={
                        goalChecks[item.key] ? 'checkbox-outline' : 'square-outline'
                      }
                      size={rf(22)}
                      color="#fff"
                      style={styles.goalCheckboxIcon}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.doneButton,
              doneButtonEnabled && styles.doneButtonEnabled,
            ]}
            disabled={!doneButtonEnabled}
            onPress={handleDonePress}
          >
            <Text
              style={[
                styles.doneButtonText,
                doneButtonEnabled && styles.doneButtonEnabledText,
              ]}
            >
              {doneLoading
                ? 'Saving...'
                : alreadySubmitted
                ? 'Completed'
                : 'Done!'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Reward card */}
      <View style={styles.rewardCard}>
        <Image
          source={require('../assets/images/points.png')}
          style={styles.rewardImage}
        />

        <View style={styles.rewardContent}>
          <Text style={styles.rewardTitle}>
            Finish your daily mission &amp; earn points!
          </Text>

          <View style={styles.rewardPointsRow}>
            <Text style={styles.pointsLabel}>My point is</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsValue}>{points}</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  const renderCalendarContent = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Calendar</Text>
      </View>
      <Text>Calendar screen coming soon.</Text>
    </View>
  );

  const renderRewardContent = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Reward</Text>
      </View>
      <Text>Reward screen coming soon.</Text>
    </View>
  );

  const renderSettingContent = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Setting</Text>
      </View>
      <Text>Settings screen coming soon.</Text>
    </View>
  );

  const renderScrollContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeContent();
      case 'calendar':
        return renderCalendarContent();
      case 'reward':
        return renderRewardContent();
      case 'setting':
        return renderSettingContent();
      default:
        return null;
    }
  };

  return (
    <View style={styles.root}>
      {/* Reward popup (Home tab only) */}
      {activeTab === 'home' && rewardModalVisible && (
        <View style={styles.rewardOverlay}>
          <LinearGradient
            colors={['#A7F7FF', '#7DEBEA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.rewardPopup}
          >
            <View style={styles.rewardPopupBody}>
              <Text style={styles.rewardPopupTitle}>
                You got {earnedPoints}pts!
              </Text>
              <Text style={styles.rewardPopupSubtitle}>
                Earn points for your health
              </Text>
            </View>

            <TouchableOpacity
              style={styles.rewardPopupButton}
              onPress={() => setRewardModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.rewardPopupButtonText}>Yay</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Mood popup (Home tab only) */}
      {activeTab === 'home' && moodPopupVisible && (
        <View style={styles.rewardOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.gotItContainer}
            onPress={() => setMoodPopupVisible(false)}
          >
            <Image
              source={require('../assets/images/gotit.png')}
              style={styles.gotItImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* TOP SAFE AREA + MAIN CONTENT */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.container}>
          {/* Fixed Top bar: avatar + bell (common to all tabs) */}
          <View style={styles.topBar}>
            <Image
              source={require('../assets/images/react-logo.png')}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.bellWrapper}>
              <Ionicons
                name="notifications-outline"
                size={rf(22)}
                color="#222"
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable content below top bar (depends on activeTab) */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderScrollContent()}
            {/* small padding above tab bar */}
            <View style={{ height: hp(4) }} />
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* BOTTOM SAFE AREA + TAB BAR (same colour) */}
      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabPress('home')}
          >
            <Ionicons
              name="home"
              size={rf(20)}
              color={activeTab === 'home' ? '#25D0C2' : '#777'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'home' && styles.tabLabelActive,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabPress('calendar')}
          >
            <Ionicons
              name="calendar-outline"
              size={rf(20)}
              color={activeTab === 'calendar' ? '#25D0C2' : '#777'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'calendar' && styles.tabLabelActive,
              ]}
            >
              Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabPress('reward')}
          >
            <Ionicons
              name="gift-outline"
              size={rf(20)}
              color={activeTab === 'reward' ? '#25D0C2' : '#777'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'reward' && styles.tabLabelActive,
              ]}
            >
              Reward
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => onTabPress('setting')}
          >
            <Ionicons
              name="settings-outline"
              size={rf(20)}
              color={activeTab === 'setting' ? '#25D0C2' : '#777'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'setting' && styles.tabLabelActive,
              ]}
            >
              Setting
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4FDDF',
  },
  safeAreaTop: {
    flex: 1,
    backgroundColor: '#F4FDDF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F4FDDF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5), // slightly smaller since topBar is outside
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    marginBottom: hp(1),
  },
  avatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
  },
  bellWrapper: {
    paddingHorizontal: wp(1),
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F4FDDF',
  },
  greetingBox: {
    alignItems: 'center',
    marginBottom: hp(3),
  },
  greetingText: {
    fontSize: rf(12),
    color: '#181A20',
  },
  greetingName: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#5EBC7F',
    marginBottom: hp(0.5),
  },
  greetingSub: {
    fontSize: rf(13),
    fontWeight: '600',
    color: '#181A20',
  },

  /* SECTIONS */
  section: {
    marginBottom: hp(3),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  sectionTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#1AA958',
  },
  sectionChevron: {
    fontSize: rf(16),
    color: '#1AA958',
  },

  /* WEEKLY SCHEDULE */
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  dayCell: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: rf(9),
    color: '#1A1A1A',
  },
  dayLabelToday: {
    color: '#25D0C2',
    fontWeight: '700',
  },
  dayNumber: {
    marginTop: hp(0.3),
    fontSize: rf(11),
    color: '#1A1A1A',
  },
  dayDone: {
    color: '#000000',
    fontWeight: '700',
  },
  dayMissed: {
    color: '#FF413E',
    fontWeight: '700',
  },
  dayTodayNumber: {
    color: '#25D0C2',
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.5),
  },
  progressTrack: {
    flex: 1,
    height: hp(0.9),
    borderRadius: hp(0.45),
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginRight: wp(2),
  },
  progressFill: {
    width: '40%',
    height: '100%',
    borderRadius: hp(0.45),
    backgroundColor: '#90C4FB',
  },
  daysLeftText: {
    fontSize: rf(11),
    color: '#181A20',
  },

  /* Mood card container */
  moodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp(6),
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(1.5),
  },
  moodItem: {
    alignItems: 'center',
    flex: 1,
  },
  moodItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  moodIcon: {
    width: wp(11),
    height: wp(11),
    marginBottom: hp(0.7),
  },
  moodLabel: {
    fontSize: rf(11),
    color: '#000000',
  },
  moodLabelSelected: {
    color: '#25D0C2',
    fontWeight: '600',
  },

  /* GOAL CARD */
  goalCard: {
    marginTop: hp(1),
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    borderRadius: wp(6),
    // subtle shadow (iOS & Android)
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  goalTextRow: {
    marginBottom: hp(2),
  },
  goalLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  // NEW: wrapper so text takes remaining space and wraps
  goalTextWrapper: {
    flex: 1,
    marginRight: wp(2),
  },
  goalText: {
    fontSize: rf(14),
    color: '#767676',
    flexShrink: 1,   // allow wrapping instead of pushing out
  },
  // NEW: keep icon visually on the right
  goalCheckboxIcon: {
    marginLeft: wp(1),
  },
  goalSquare: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(1),
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doneButton: {
    paddingVertical: hp(1.4),
    borderRadius: wp(10),
    backgroundColor: '#767676',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#B5B5B5',
    fontSize: rf(14),
    fontWeight: '600',
  },
  doneButtonEnabled: {
    backgroundColor: '#25D0C2', // enabled-style; tweak as you like
  },
  doneButtonEnabledText: {
    color: '#FFFFFF',
    fontSize: rf(14),
    fontWeight: '600',
  },

  /* REWARD CARD */
  rewardCard: {
    marginTop: hp(1),
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(5),
    borderRadius: wp(6),
    backgroundColor: '#EFD0CA', // slightly softer pink; tweak if needed
    flexDirection: 'row',
    alignItems: 'center',
    // subtle shadow (optional)
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rewardImage: {
    width: wp(22),
    height: wp(22),
    marginRight: wp(4),
    resizeMode: 'contain',
  },
  rewardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  rewardTitle: {
    fontSize: rf(12),
    color: '#333',
    marginBottom: hp(1.6),
  },
  rewardPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: rf(13),
    fontWeight: '600',
    marginRight: wp(3),
    color: '#222',
  },
  pointsBadge: {
    paddingHorizontal: wp(7),
    paddingVertical: hp(0.9),
    borderRadius: wp(7),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValue: {
    fontSize: rf(18),
    fontWeight: '700',
    color: '#000',
  },

  /* BOTTOM TAB BAR */
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: hp(1),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F9F9F9',
  },
  tabItem: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: rf(11),
    marginTop: hp(0.3),
    color: '#777',
  },
  tabLabelActive: {
    color: '#25D0C2',
    fontWeight: '600',
  },
  bottomSafeArea: {
    backgroundColor: '#F9F9F9', // match tabBar
  },

  rewardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)', // slightly grey out background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  rewardPopup: {
    width: wp(70),
    borderRadius: wp(5),
    overflow: 'hidden', // so the gradient + button share rounded corners
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  rewardPopupBody: {
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    alignItems: 'center',
  },
  rewardPopupTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: '#000000',
    marginBottom: hp(0.8),
    textAlign: 'center',
  },
  rewardPopupSubtitle: {
    fontSize: rf(13),
    color: '#000000',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  rewardPopupButton: {
    width: '100%',
    paddingVertical: hp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.12)', // thin divider like in your screenshot
  },
  rewardPopupButtonText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: '#000000',
  },

  gotItContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  gotItImage: {
    width: wp(60),    // ~60% of screen width
    height: hp(25),   // adjust to your PNG aspect
  },
});
