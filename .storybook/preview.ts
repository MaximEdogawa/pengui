import React from 'react'
import { StoryWrapper } from './StoryWrapper'
import '../src/app/globals.css'
// Import wallet connect package styles
import '@maximedogawa/chia-wallet-connect-react/styles'

const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0f172a',
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      React.createElement(StoryWrapper, {}, React.createElement(Story))
    ),
  ],
};

export default preview;