import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🦞</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Lobster Squad PWA
        </h1>
        <p className="text-gray-600 mb-6">
          龙虾小队 - 任务执行系统
        </p>
        
        <div className="bg-orange-100 rounded-lg p-4 mb-6">
          <p className="text-orange-800 font-medium">
            当前任务计数：{count}
          </p>
        </div>

        <button
          onClick={() => setCount((count) => count + 1)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          🦞 完成任务 +1
        </button>

        <p className="text-gray-400 text-sm mt-6">
          Built with Vite + React + TypeScript + Tailwind
        </p>
      </div>
    </div>
  )
}

export default App
