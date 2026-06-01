"use client";

import dynamic from "next/dynamic";

const LiveCommitStream = dynamic(() => import("./LiveCommitStream"), {
  ssr: false,
  loading: () => null,
});

export default function DynamicLiveCommitStream() {
  return <LiveCommitStream />;
}
