import type { ReactNode } from "react"
import { ArrowUp, CornerUpLeft, CornerUpRight } from "lucide-react"
import {
  AlarmClock,
  Battery,
  BatteryLevel,
  CalendarEvent,
  CalendarWidget,
  CalorieCounter,
  ClockWithPhoto,
  Cycling,
  DeliveryCard,
  DirectionCard,
  ExpenseTracker,
  FlightWidget,
  LiveScore,
  MobileDetail,
  MusicStackInteraction,
  MusicWidget,
  Notes,
  Profile,
  Reminder,
  ReminderWidget,
  ScoreBoard,
  SecurityAlert,
  ShoppingList,
  SleepTracker,
  StorageStatus,
  StorageWidget,
  StudyTimer,
  TeamClock,
  VpnWidget,
  WaterTracker,
  WeatherCard,
  WeeklyProgress,
} from "@/components/widgets"

export interface WidgetConfig {
  id: string
  component: ReactNode
  className?: string
  disabled?: boolean
}

export const initialWidgets: WidgetConfig[] = [
  {
    id: "alarm-clock",
    component: (
      <AlarmClock
        alarms={[
          { id: 0, time: "7:30 AM", repetition: "Once" },
          { id: 1, time: "8:00 AM", repetition: "Daily" },
          { id: 2, time: "9:00 AM", repetition: "Weekdays" },
        ]}
      />
    ),
    className: "flex justify-center",
  },
  {
    id: "battery",
    component: <Battery />,
    className: "flex justify-center",
  },
  {
    id: "battery-level",
    component: <BatteryLevel />,
    className: "flex justify-center",
  },
  {
    id: "calendar-event",
    component: (
      <CalendarEvent
        dates={[
          {
            title: "Backlog Updates",
            time: "10:30 - 10:45",
            color: "text-purple-900",
            bgcolor: "bg-purple-200",
            barColor: "bg-purple-700",
            dateColor: "text-purple-600",
          },
          {
            title: "Review Jade A",
            time: "12:00 - 12:45",
            color: "text-cyan-900",
            bgcolor: "bg-cyan-200",
            barColor: "bg-cyan-700",
            dateColor: "text-cyan-600",
          },
          {
            title: "Design Meeting",
            time: "14:00 - 15:00",
            color: "text-green-900",
            bgcolor: "bg-green-200",
            barColor: "bg-green-700",
            dateColor: "text-green-600",
          },
          {
            title: "Development",
            time: "16:00 - 17:00",
            color: "text-yellow-900",
            bgcolor: "bg-yellow-200",
            barColor: "bg-yellow-700",
            dateColor: "text-yellow-600",
          },
          {
            title: "QA Testing",
            time: "18:00 - 19:00",
            color: "text-red-900",
            bgcolor: "bg-red-200",
            barColor: "bg-red-700",
            dateColor: "text-red-600",
          },
        ]}
      />
    ),
    className: "flex justify-center",
  },
  {
    disabled: true,
    id: "calendar-widget",
    component: <CalendarWidget />,
    className: "flex justify-center",
  },
  {
    disabled: true,
    id: "calorie-counter",
    component: (
      <CalorieCounter
        goal={4000}
        fulfilled={120}
        image="https://plus.unsplash.com/premium_vector-1689096672037-98309fdc7f44?bg=FFFFFF&q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3"
      />
    ),
    className: "flex justify-center",
  },
  {
    id: "clock-with-photo",
    component: <ClockWithPhoto />,
    className: "flex justify-center",
  },
  {
    id: "cycling",
    component: <Cycling />,
    className: "flex justify-center",
  },
  {
    id: "delivery-card",
    component: <DeliveryCard />,
    className: "flex justify-center",
  },
  {
    id: "direction-card",
    component: (
      <DirectionCard
        directionValues={[
          {
            distance: 350,
            direction: "right",
            to: "Gurkha St.",
            iconType: CornerUpRight,
          },
          {
            distance: 700,
            direction: "left",
            to: "Rounding St.",
            iconType: CornerUpLeft,
          },
          {
            distance: 100,
            direction: "left",
            to: "Fulbari marga",
            iconType: CornerUpLeft,
          },
          {
            distance: 1000,
            direction: "straight",
            to: "hwy 16",
            iconType: ArrowUp,
          },
        ]}
      />
    ),
    className: "flex justify-center",
  },
  {
    id: "expense-tracker",
    component: (
      <ExpenseTracker
        spending={[
          { day: "M", amount: 700 },
          { day: "T", amount: 160 },
          { day: "W", amount: 500 },
          { day: "T", amount: 300 },
          { day: "F", amount: 1280 },
          { day: "Sa", amount: 200 },
          { day: "Su", amount: 600 },
        ]}
      />
    ),
    className: "flex justify-center",
  },
  {
    id: "flight-widget",
    component: <FlightWidget />,
    className: "flex justify-center",
  },
  {
    id: "live-score",
    component: <LiveScore />,
    className: "flex justify-center",
  },
  {
    id: "mobile-detail",
    component: <MobileDetail />,
    className: "flex justify-center",
  },
  {
    id: "music-widget",
    component: <MusicWidget />,
    className: "flex justify-center",
  },
  {
    id: "notes",
    component: <Notes />,
    disabled: true,
    className: "flex justify-center",
  },
  {
    id: "profile",
    component: <Profile />,
    className: "flex justify-center",
  },
  {
    id: "reminder",
    component: <Reminder />,
    className: "flex justify-center",
  },
  {
    id: "reminder-widget",
    component: <ReminderWidget />,
    disabled: true,
    className: "flex justify-center",
  },
  {
    id: "score-board",
    component: (
      <ScoreBoard
        items={[
          {
            label: "A",
            progress: 34,
            className: "rounded-md bg-green-500",
          },
          {
            label: "B",
            progress: 14,
            className: "rounded-md bg-red-500",
          },
          {
            label: "C",
            progress: 34,
            className: "rounded-md bg-green-500",
          },
          {
            label: "D",
            progress: 70,
            className: "rounded-md bg-green-500",
          },
          {
            label: "E",
            progress: 52,
            className: "rounded-md bg-green-500",
          },
          {
            label: "F",
            progress: 30,
            className: "rounded-md bg-green-500",
          },
          {
            label: "G",
            progress: 37,
            className: "rounded-md bg-green-500",
          },
          {
            label: "H",
            progress: 72,
            className: "rounded-md bg-green-500",
          },
          {
            label: "I",
            progress: 42,
            className: "rounded-md bg-green-500",
          },
        ]}
      />
    ),
    className: "flex justify-center",
  },
  {
    id: "security-alert",
    component: <SecurityAlert />,
    className: "flex justify-center",
  },
  {
    id: "shopping-list",
    component: <ShoppingList />,
    className: "flex justify-center",
  },
  {
    id: "sleep-tracker",
    component: (
      <SleepTracker
        items={[
          {
            label: "A",
            progress: 45,
            className: "rounded-md dark:bg-blue-400/45 bg-blue-600/45",
          },
          {
            label: "B",
            progress: 25,
            className: "rounded-md dark:bg-blue-400/25 bg-blue-600/25",
          },
          {
            label: "C",
            progress: 15,
            className: "rounded-md dark:bg-blue-400/15 bg-blue-600/15",
          },
          {
            label: "B",
            progress: 10,
            className: "rounded-md dark:bg-blue-400/20 bg-blue-600/20",
          },
          {
            label: "C",
            progress: 15,
            className: "rounded-md dark:bg-blue-300/15 bg-blue-600/15",
          },
          {
            label: "D",
            progress: 30,
            className: "rounded-md dark:bg-blue-300/30 bg-blue-600/30",
          },
          {
            label: "E",
            progress: 70,
            className: "rounded-md dark:bg-blue-300/70 bg-blue-600/70",
          },
          {
            label: "A",
            progress: 45,
            className: "rounded-md dark:bg-blue-300/45 bg-blue-600/45",
          },
          {
            label: "B",
            progress: 10,
            className: "rounded-md dark:bg-blue-300/20 bg-blue-600/20",
          },
          {
            label: "C",
            progress: 15,
            className: "rounded-md dark:bg-blue-300/15 bg-blue-600/15",
          },
          {
            label: "B",
            progress: 10,
            className: "rounded-md dark:bg-blue-300/20 bg-blue-600/20",
          },
          {
            label: "B",
            progress: 10,
            className: "rounded-md dark:bg-blue-300/20 bg-blue-600/20",
          },
          {
            label: "C",
            progress: 85,
            className: "rounded-md dark:bg-blue-300/85 bg-blue-600/85",
          },
          {
            label: "D",
            progress: 90,
            className: "rounded-md dark:bg-blue-300/90 bg-blue-600/90",
          },
          {
            label: "E",
            progress: 15,
            className: "rounded-md dark:bg-blue-300/15 bg-blue-600/15",
          },
        ]}
        image="https://plus.unsplash.com/premium_photo-1675107359574-e3ba5f47a1a2?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      />
    ),
    className: "flex justify-center",
  },
  {
    id: "storage-status",
    disabled: true,
    component: <StorageStatus />,
    className: "flex justify-center",
  },
  {
    id: "storage-widget",
    component: <StorageWidget />,
    className: "flex justify-center",
  },
  {
    id: "study-timer",
    component: (
      <StudyTimer
        segments={[
          { value: 57, color: "orange" },
          { value: 24, color: "pink" },
          { value: 26, color: "yellow" },
        ]}
      />
    ),
    className: "flex justify-center",
  },
  {
    id: "vpn-widget",
    component: <VpnWidget />,
    className: "flex justify-center",
  },
  {
    id: "water-tracker",
    component: <WaterTracker dailyGoal={5000} />,
    className: "flex justify-center",
  },
  {
    id: "weather-card",
    component: <WeatherCard />,
    className: "flex justify-center",
  },
  {
    id: "weekly-progress",
    component: <WeeklyProgress />,
    className: "flex justify-center",
  },
  {
    id: "team-clock",
    component: (
      <TeamClock
        users={[
          { name: "John", city: "New York", country: "USA", timeDifference: "-5", pfp: "https://i.pravatar.cc/150?img=1" },
          { name: "Jane", city: "London", country: "UK", timeDifference: "0", pfp: "https://i.pravatar.cc/150?img=2" },
          { name: "Bob", city: "Tokyo", country: "Japan", timeDifference: "9", pfp: "https://i.pravatar.cc/150?img=3" },
        ]}
        clockSize={150}
        animationDuration={0.3}
        accentColor="#000"
        backgroundColor="#ffffff"
        textColor="#1f2937"
        borderColor="#e5e7eb"
        hoverBackgroundColor="#f3f4f6"
        showSeconds={false}
        use24HourFormat={false}
      />
    ),
    disabled: true,
    className: "flex justify-center col-span-full",
  },
  {
    id: "music-stack-interaction",
    disabled: true,
    component: (
      <MusicStackInteraction
        albums={[
          { id: 1, title: "Album 1", artist: "Artist 1", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200" },
          { id: 2, title: "Album 2", artist: "Artist 2", cover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200" },
          { id: 3, title: "Album 3", artist: "Artist 3", cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200" },
        ]}
      />
    ),
    className: "flex justify-center col-span-full",
  },
].filter(widget => widget.disabled === undefined || !widget.disabled)
