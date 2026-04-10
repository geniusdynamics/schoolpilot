# OpenCode + Kimi For Coding (K2.5) Setup · GitHub

> Source: https://gist.github.com/OmerFarukOruc/26262e9c883b3c2310c507fdf12142f4
> Cached: 2026-04-07T13:34:33.458Z

---

# OpenCode + Kimi For Coding (K2.5) Setup

[](#opencode--kimi-for-coding-k25-setup)
## 1. Add credentials

[](#1-add-credentials)
opencode auth login
# Select "Kimi For Coding"
# Enter your API key (sk-kimi-...)
## 2. Add provider to `opencode.jsonc`

[](#2-add-provider-to-opencodejsonc)
{
  "provider": {
    "kimi-for-coding": {
      "name": "Kimi For Coding",
      "npm": "@ai-sdk/anthropic",
      "options": {
        "baseURL": "https://api.kimi.com/coding/v1"
      },
      "models": {
        "k2p5": {
          "name": "Kimi K2.5",
          "reasoning": true,
          "attachment": false,
          "limit": {
            "context": 262144,
            "output": 32768
          },
          "modalities": {
            "input": ["text", "image", "video"],
            "output": ["text"]
          },
          "options": {
            "interleaved": {
              "field": "reasoning_content"
            }
          }
        }
      }
    }
  }
}
## 3. Use the model

[](#3-use-the-model)
{
  "model": "kimi-for-coding/k2p5"
}
## Key Details

[](#key-details)

Setting
Value

Provider ID
`kimi-for-coding`

Model ID
`k2p5`

SDK
`@ai-sdk/anthropic`

Base URL
`https://api.kimi.com/coding/v1`

## Important Fix (Jan 2026)

[](#important-fix-jan-2026)
If you get error: `thinking is enabled but reasoning_content is missing in assistant tool call message`

### Solution 1: Add `interleaved` option (shown above)

[](#solution-1-add-interleaved-option-shown-above)
The `interleaved.field: "reasoning_content"` option tells OpenCode how to handle the thinking/reasoning output.

### Solution 2: Update DCP Plugin to v1.2.8+

[](#solution-2-update-dcp-plugin-to-v128)
If using `@tarquinen/opencode-dcp`, update to v1.2.8+ which has the fix for DeepSeek/Kimi models.

**If using OCX (kdcokenny/ocx):**

OCX stores configs in `~/.opencode/opencode.jsonc` (NOT `~/.config/opencode/`). Edit directly:

# Update DCP to latest
sed -i 's/@tarquinen\/opencode-dcp@[0-9.]*/@tarquinen\/opencode-dcp@latest/' ~/.opencode/opencode.jsonc

# Clear caches to force fresh resolution
rm -rf ~/.cache/opencode ~/.bun/install/cache

# Restart OpenCode
**Config file hierarchy (OCX):**

Location
Purpose

`~/.opencode/opencode.jsonc`
**Active config** (OCX local working dir)

`~/.config/opencode/profiles/default/opencode.jsonc`
Profile template

`~/.config/opencode/opencode.json`
Main config

See: [OpenCode Issue #10996](https://github.com/anomalyco/opencode/issues/10996)

Get your API key at [kimi.com/code](https://kimi.com/code)