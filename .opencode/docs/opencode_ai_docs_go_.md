# Go | OpenCode

> Source: https://opencode.ai/docs/go/
> Cached: 2026-04-07T13:34:31.308Z

---

# Go

Low cost subscription for open coding models.

       OpenCode Go is a low cost subscription — **$5 for your first month**, then **$10/month** — that gives you reliable access to popular open coding models.

Note

OpenCode Go is currently in beta.

Go works like any other provider in OpenCode. You subscribe to OpenCode Go and
get your API key. It’s **completely optional** and you don’t need to use it to
use OpenCode.
It is designed primarily for international users, with models hosted in the US, EU, and Singapore for stable global access.

## [Background](#background)

Open models have gotten really good. They now reach performance close to
proprietary models for coding tasks. And because many providers can serve them
competitively, they are usually far cheaper.
However, getting reliable, low latency access to them can be difficult. Providers
vary in quality and availability.
Tip

We tested a select group of models and providers that work well with OpenCode.

To fix this, we did a couple of things:

We tested a select group of open models and talked to their teams about how to
best run them.
We then worked with a few providers to make sure these were being served
correctly.
Finally, we benchmarked the combination of the model/provider and came up
with a list that we feel good recommending.

OpenCode Go gives you access to these models for **$5 for your first month**, then **$10/month**.

## [How it works](#how-it-works)

OpenCode Go works like any other provider in OpenCode.

You sign in to **[OpenCode Zen](https://opencode.ai/auth)**, subscribe to Go, and
copy your API key.
You run the `/connect` command in the TUI, select `OpenCode Go`, and paste
your API key.
- Run `/models` in the TUI to see the list of models available through Go.

Note

Only one member per workspace can subscribe to OpenCode Go.

The current list of models includes:

- **GLM-5**

- **Kimi K2.5**

- **MiMo-V2-Pro**

- **MiMo-V2-Omni**

- **MiniMax M2.5**

- **MiniMax M2.7**

The list of models may change as we test and add new ones.

## [Usage limits](#usage-limits)

OpenCode Go includes the following limits:

- **5 hour limit** — $12 of usage

- **Weekly limit** — $30 of usage

- **Monthly limit** — $60 of usage

Limits are defined in dollar value. This means your actual request count depends on the model you use. Cheaper models like MiniMax M2.5 allow for more requests, while higher-cost models like GLM-5 allow for fewer.

The table below provides an estimated request count based on typical Go usage patterns:

GLM-5Kimi K2.5MiMo-V2-ProMiMo-V2-OmniMiniMax M2.7MiniMax M2.5requests per 5 hour1,1501,8501,2902,15014,00020,000requests per week2,8804,6303,2255,45035,00050,000requests per month5,7509,2506,45010,90070,000100,000
Estimates are based on observed average request patterns:

- GLM-5 — 700 input, 52,000 cached, 150 output tokens per request

- Kimi K2.5 — 870 input, 55,000 cached, 200 output tokens per request

- MiniMax M2.7/M2.5 — 300 input, 55,000 cached, 125 output tokens per request

- MiMo-V2-Pro — 350 input, 41,000 cached, 250 output tokens per request

- MiMo-V2-Omni — 1000 input, 60,000 cached, 140 output tokens per request

You can track your current usage in the **[console](https://opencode.ai/auth)**.

Tip

If you reach the usage limit, you can continue using the free models.

Usage limits may change as we learn from early usage and feedback.

### [Usage beyond limits](#usage-beyond-limits)

If you also have credits on your Zen balance, you can enable the **Use balance**
option in the console. When enabled, Go will fall back to your Zen balance
after you’ve reached your usage limits instead of blocking requests.

## [Endpoints](#endpoints)

You can also access Go models through the following API endpoints.

ModelModel IDEndpointAI SDK PackageGLM-5glm-5`https://opencode.ai/zen/go/v1/chat/completions``@ai-sdk/openai-compatible`Kimi K2.5kimi-k2.5`https://opencode.ai/zen/go/v1/chat/completions``@ai-sdk/openai-compatible`MiMo-V2-Promimo-v2-pro`https://opencode.ai/zen/go/v1/chat/completions``@ai-sdk/openai-compatible`MiMo-V2-Omnimimo-v2-omni`https://opencode.ai/zen/go/v1/chat/completions``@ai-sdk/openai-compatible`MiniMax M2.7minimax-m2.7`https://opencode.ai/zen/go/v1/messages``@ai-sdk/anthropic`MiniMax M2.5minimax-m2.5`https://opencode.ai/zen/go/v1/messages``@ai-sdk/anthropic`
The [model id](/docs/config/#models) in your OpenCode config
uses the format `opencode-go/&#x3C;model-id>`. For example, for Kimi K2.5, you would
use `opencode-go/kimi-k2.5` in your config.

## [Privacy](#privacy)

The plan is designed primarily for international users, with models hosted in the US, EU, and Singapore for stable global access. Our providers follow a zero-retention policy and do not use your data for model training.

## [Goals](#goals)

We created OpenCode Go to:

- Make AI coding **accessible** to more people with a low cost subscription.

- Provide **reliable** access to the best open coding models.

- Curate models that are **tested and benchmarked** for coding agent use.

- Have **no lock-in** by allowing you to use any other provider with OpenCode as well.

  [Edit page](https://github.com/anomalyco/opencode/edit/dev/packages/web/src/content/docs/go.mdx)[Found a bug? Open an issue](https://github.com/anomalyco/opencode/issues/new)[Join our Discord community](https://opencode.ai/discord) Select language   EnglishالعربيةBosanskiDanskDeutschEspañolFrançaisItaliano日本語한국어Norsk BokmålPolskiPortuguês (Brasil)РусскийไทยTürkçe简体中文繁體中文    &copy; [Anomaly](https://anoma.ly)

Last updated: Apr 6, 2026