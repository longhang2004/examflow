export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-nearblack">ExamFlow</h1>
          <p className="text-sm text-stone mt-1">Exam management, simplified.</p>
        </div>
        <div className="bg-ivory rounded-very-rounded border border-border-cream shadow-whisper p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
