'use client'

import { useSettingsStore, type AppLanguage } from '@/store/settings.store'

const dictionaries = {
  en: {
    common: {
      settings: 'Settings',
      preferences: 'Preferences',
      appearance: 'Appearance',
      language: 'Language',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      compactMode: 'Compact mode',
      reduceMotion: 'Reduce motion',
      save: 'Save',
      cancel: 'Cancel',
      logout: 'Logout',
      overview: 'Overview',
      dashboard: 'Dashboard',
      questions: 'Questions',
      questionBank: 'Question Bank',
      exams: 'Exams',
      analytics: 'Analytics',
      home: 'Home',
      myLearning: 'My learning',
      review: 'Review',
      history: 'History',
    },
    settings: {
      description: 'Control how ExamFlow looks and behaves on this device.',
      appearanceDescription: 'Choose a theme and density that match your working environment.',
      languageDescription: 'Choose the interface language. AI question language is still selected inside the AI modal.',
      parentRequests: 'Parent follow requests',
      parentRequestsDescription: 'Manage parent accounts that request access to your progress.',
      noParentRequests: 'No pending parent requests.',
      loadingRequests: 'Loading requests...',
      accept: 'Accept',
      decline: 'Decline',
    },
  },
  vi: {
    common: {
      settings: 'Cài đặt',
      preferences: 'Tùy chọn',
      appearance: 'Giao diện',
      language: 'Ngôn ngữ',
      theme: 'Chủ đề',
      light: 'Sáng',
      dark: 'Tối',
      system: 'Theo hệ thống',
      compactMode: 'Chế độ gọn',
      reduceMotion: 'Giảm chuyển động',
      save: 'Lưu',
      cancel: 'Hủy',
      logout: 'Đăng xuất',
      overview: 'Tổng quan',
      dashboard: 'Bảng điều khiển',
      questions: 'Câu hỏi',
      questionBank: 'Ngân hàng câu hỏi',
      exams: 'Đề thi',
      analytics: 'Phân tích',
      home: 'Trang chủ',
      myLearning: 'Học tập',
      review: 'Ôn tập',
      history: 'Lịch sử',
    },
    settings: {
      description: 'Điều chỉnh cách ExamFlow hiển thị và hoạt động trên thiết bị này.',
      appearanceDescription: 'Chọn chủ đề và mật độ hiển thị phù hợp với môi trường làm việc.',
      languageDescription: 'Chọn ngôn ngữ giao diện. Ngôn ngữ câu hỏi AI vẫn được chọn trong modal AI.',
      parentRequests: 'Yêu cầu theo dõi từ phụ huynh',
      parentRequestsDescription: 'Quản lý tài khoản phụ huynh yêu cầu truy cập tiến độ học tập của bạn.',
      noParentRequests: 'Không có yêu cầu đang chờ.',
      loadingRequests: 'Đang tải yêu cầu...',
      accept: 'Chấp nhận',
      decline: 'Từ chối',
    },
  },
} as const

type Dictionary = typeof dictionaries.en
type Namespace = keyof Dictionary
type TranslationKey<N extends Namespace> = keyof Dictionary[N]

export function useI18n() {
  const language = useSettingsStore((state) => state.language)
  const dictionary = dictionaries[language]

  function t<N extends Namespace>(namespace: N, key: TranslationKey<N>) {
    const namespaceDictionary = dictionary[namespace] as Record<TranslationKey<N>, string>
    return namespaceDictionary[key]
  }

  return { language, t }
}

export function getDictionary(language: AppLanguage) {
  return dictionaries[language]
}
