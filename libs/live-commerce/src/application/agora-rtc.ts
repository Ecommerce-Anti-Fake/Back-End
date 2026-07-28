export function agoraChannelName(sessionId: string) {
  const channelName = `live_${sessionId.replace(/-/g, '')}`;
  if (
    !/^[A-Za-z0-9_]+$/.test(channelName) ||
    Buffer.byteLength(channelName) >= 64
  ) {
    throw new Error('Live session ID cannot be converted to an Agora channel');
  }
  return channelName;
}

export function buildAgoraCutoverPlan(
  sessions: Array<{ id: string; status: string }>,
) {
  if (sessions.some((session) => session.status === 'LIVE')) {
    throw new Error(
      'End all active Cloudflare livestreams before the Agora cutover',
    );
  }

  return sessions
    .filter((session) => session.status === 'SCHEDULED')
    .map((session) => ({
      sessionId: session.id,
      channelName: agoraChannelName(session.id),
    }));
}
