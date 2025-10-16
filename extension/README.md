# Real-Time Caption Capture - Chrome Extension

**🎤 Live caption capture for Microsoft Teams, Zoom, and Google Meet**

This Chrome Extension enables real-time capture of meeting captions and automatically saves them as structured markdown transcripts.

## Features

- ✅ **Real-Time Capture**: Monitors caption elements as they appear
- ✅ **Multi-Platform**: Teams, Zoom, Google Meet (Teams fully implemented)
- ✅ **Speaker Detection**: Automatically identifies speakers
- ✅ **WebSocket Streaming**: Real-time data transmission to backend
- ✅ **Markdown Export**: Clean, structured transcript files
- ✅ **Reusable Architecture**: Modular design for future tools

## Architecture

This extension implements a **2-part modular architecture**:

### Part 1: Generic Real-Time Data Capture (`realtime-capture.ts`)
- WebSocket server for receiving streams
- Session management
- Event buffering and storage
- Multi-client support
- **Reusable for other mini-tools**

### Part 2: Teams-Specific Processing (`teams-transcript-handler.ts`)
- Speaker and timestamp extraction
- Markdown formatting
- Storage integration
- **Can be adapted for other use cases**

## Installation

### Step 1: Install Dependencies

Make sure the backend server has the required dependencies:

```bash
cd mcp-bridge
npm install ws
```

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension` directory: `C:\Users\claus\mcp-bridge\extension`

### Step 3: Add Extension Icons

Create three PNG icon files in the `extension/icons` directory:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

You can use any PNG files temporarily. The extension will work without custom icons.

### Step 4: Start Backend Server

The extension requires the backend WebSocket server to be running:

```bash
cd mcp-bridge
npm run dev
```

You should see:
```
📡 WebSocket server ready at ws://localhost:3000/realtime-capture
🎤 Real-time caption capture enabled
```

## Usage

### Starting a Capture Session

1. **Join a Teams meeting** (with captions enabled)
2. **Click the extension icon** in Chrome toolbar
3. **Enter a title** for the capture session (e.g., "Team Standup - Jan 16")
4. **Click "Start Capture"**

The extension will:
- Monitor Teams caption elements using MutationObserver
- Extract text, speakers, and timestamps
- Stream data to backend via WebSocket
- Display live caption count in popup

### Stopping a Capture Session

1. **Click the extension icon**
2. **Click "Stop Capture"**

The extension will:
- Flush remaining captions to backend
- Trigger transcript processing
- Save markdown file to `./transcripts/`
- Add entry to transcript index

### Viewing Transcripts

1. Open the **Mini Tools dashboard**: http://localhost:8080/mini-tools.html
2. View **all captured transcripts** with metadata
3. **Download** transcripts as `.md` files
4. **Delete** old transcripts

## How It Works

### Content Script (`content-teams.js`)

1. **Detects meeting page**: Checks URL for `teams.microsoft.com`
2. **Finds caption container**: Uses multiple CSS selectors
3. **Observes DOM mutations**: MutationObserver monitors changes
4. **Extracts captions**: Parses speaker, timestamp, text
5. **Buffers captions**: Collects 10 captions or 5 seconds
6. **Sends to background**: Chrome messaging API

### Background Service Worker (`background.js`)

1. **Receives caption data**: From content script
2. **Manages WebSocket**: Connects to backend server
3. **Streams data**: Real-time transmission
4. **Coordinates sessions**: Start/stop capture
5. **Updates popup**: Live status and counts

### Backend Server (`realtime-capture.ts`)

1. **WebSocket server**: Accepts connections from extension
2. **Session management**: Track active captures
3. **Event buffering**: Collects and stores events
4. **Periodic flush**: Writes to disk every 10 seconds
5. **Event handlers**: Triggers processing on session end

### Processing Layer (`teams-transcript-handler.ts`)

1. **Listens for session end**: Event-driven architecture
2. **Converts to transcript entries**: Speaker, timestamp, text
3. **Generates markdown**: Structured formatting
4. **Saves to disk**: `.md` files and index
5. **Integrates with existing UI**: Mini Tools dashboard

## File Structure

```
extension/
├── manifest.json              # Extension configuration
├── content-teams.js           # Teams caption monitor
├── content-zoom.js            # Zoom placeholder
├── content-meet.js            # Google Meet placeholder
├── background.js              # WebSocket client
├── popup.html                 # Extension UI
├── popup.js                   # UI controller
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md                  # This file

src/utils/
├── realtime-capture.ts        # Part 1: Generic capture
├── teams-transcript-handler.ts # Part 2: Teams processing
└── transcript-processor.ts    # Markdown generation

dashboard/public/
└── mini-tools.html            # Web UI for transcripts
```

## Configuration

### Caption Selectors (Teams)

The extension uses multiple selectors to find captions:

```javascript
captionContainerSelectors: [
  '[data-tid="closed-captions-v2-container"]',
  '[class*="caption"]',
  '[class*="subtitle"]',
  '[class*="transcription"]',
  '.fui-StyledText',
  '[role="log"]'
]
```

### WebSocket URL

Default: `ws://localhost:3000/realtime-capture`

To change, edit `background.js`:
```javascript
const CONFIG = {
  backendUrl: 'ws://your-server:3000/realtime-capture'
};
```

## Troubleshooting

### Extension Won't Load

- **Check Chrome version**: Requires Chrome 88+ (Manifest V3)
- **Check developer mode**: Must be enabled
- **Check file permissions**: Extension directory must be readable

### Captions Not Captured

- **Enable Teams captions**: Settings > Accessibility > Live captions
- **Check console**: Open DevTools in Teams tab, look for `[Teams Capture]` logs
- **Verify selectors**: Teams UI changes may require selector updates

### WebSocket Connection Failed

- **Check server running**: `npm run dev` in `mcp-bridge` directory
- **Check port**: Default is 3000, change if needed
- **Check firewall**: Allow connections to localhost:3000
- **Check browser console**: Extension popup > DevTools > Console

### No Transcripts Appearing

- **Check backend logs**: Look for `[RealtimeCapture]` and `[TeamsHandler]` messages
- **Check storage directory**: `./transcripts/` should exist
- **Check permissions**: Backend must have write access

## Development

### Adding Support for Zoom/Meet

1. **Research caption selectors**: Inspect DOM in Zoom/Meet
2. **Update content script**: Modify `content-zoom.js` or `content-meet.js`
3. **Test capture**: Verify MutationObserver works
4. **Add platform handler**: Extend `teams-transcript-handler.ts` if needed

### Debugging

**Content Script:**
```javascript
// Open DevTools in the meeting tab
// Look for console logs: [Teams Capture]
```

**Background Script:**
```javascript
// Click extension icon
// Right-click popup > Inspect
// Navigate to Service Worker
```

**Backend:**
```javascript
// Check terminal logs
// Look for: [RealtimeCapture], [TeamsHandler]
```

## Performance

- **Memory usage**: ~10-50 MB per active session
- **CPU usage**: <1% (MutationObserver is efficient)
- **Network**: ~1-5 KB/min per session (low bandwidth)
- **Storage**: ~10-100 KB per hour of meeting

## Security

- **Local-only**: Extension connects to localhost:3000
- **No external requests**: All data stays on your machine
- **No tracking**: No analytics or telemetry
- **Permissions**: Only accesses Teams/Zoom/Meet domains

## Future Enhancements

- [ ] Zoom and Google Meet support
- [ ] Live preview in extension popup
- [ ] Export to PDF
- [ ] Vector database integration
- [ ] Search and filter transcripts
- [ ] Speaker identification AI
- [ ] Translation support
- [ ] Custom styling for markdown

## License

Part of the MCP Universal AI Bridge project.

## Support

For issues or questions:
1. Check this README
2. Check backend server logs
3. Check extension console logs
4. Report issues with full logs and steps to reproduce
