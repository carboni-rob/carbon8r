import withCarbon8r from 'next-carbon8r'

export default withCarbon8r({
  reactStrictMode: true,
  // Keep `next dev` from dropping AGENTS.md / CLAUDE.md into the repo.
  agentRules: false
})
