import clsx from 'clsx'

export function TabBar({
  activeTab,
  width,
  isLoading,
  showPreviewTab,
  onChange,
}) {
  return (
    <div
      className="flex items-center flex-none pl-5 pr-4 sm:pl-6 absolute z-10 top-0 left-0 -mt-px"
      style={{
        width,
      }}
    >
      <div className="flex space-x-5">
        <TabButton
          isActive={activeTab === 'html'}
          onClick={() => onChange('html')}
        >
          HTML
        </TabButton>
        <TabButton
          isActive={activeTab === 'css'}
          onClick={() => onChange('css')}
        >
          CSS
        </TabButton>
        <TabButton
          isActive={activeTab === 'config'}
          onClick={() => onChange('config')}
        >
          Config
        </TabButton>
        {showPreviewTab && (
          <TabButton
            isActive={activeTab === 'preview'}
            onClick={() => onChange('preview')}
          >
            Preview
          </TabButton>
        )}
      </div>
      {isLoading && (
        <p className="ml-auto">
          <span className="sr-only">Loading</span>
          <svg fill="none" viewBox="0 0 24 24" className="w-4 h-4 animate-spin">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </p>
      )}
    </div>
  )
}

function TabButton({ isActive, onClick, children }) {
  return (
    <button
      type="button"
      className={clsx(
        'flex text-xs leading-4 font-medium px-0.5 border-t-2 focus:outline-none transition-colors duration-150',
        {
          'border-turquoise-500 text-gray-900 dark:text-white': isActive,
          'border-transparent text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-white': !isActive,
        }
      )}
      onClick={onClick}
    >
      <span className="border-b-2 border-transparent py-2.5">{children}</span>
    </button>
  )
}
