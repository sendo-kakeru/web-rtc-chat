import { useRef, useState } from "react";
import "./App.css";

const configuration = { iceServers: [] };

function App() {
  const [isOfferer, setIsOfferer] = useState(false);
  const [sdp, setSdp] = useState("");
  const [remoteSdp, setRemoteSdp] = useState("");
  const [candidate, setCandidate] = useState("");
  const [remoteCandidate, setRemoteCandidate] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<string[]>([]);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  // シグナリング情報のクリア
  const reset = () => {
    setSdp("");
    setRemoteSdp("");
    setCandidate("");
    setRemoteCandidate("");
    setMessage("");
    setChat([]);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    channelRef.current = null;
  };

  // オファー作成
  const createOffer = async () => {
    reset();
    setIsOfferer(true);
    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;
    const channel = pc.createDataChannel("chat");
    channelRef.current = channel;
    channel.onmessage = (e) => setChat((c) => [...c, `相手: ${e.data}`]);
    channel.onopen = () => setChat((c) => [...c, "DataChannel OPEN"]);
    channel.onclose = () => setChat((c) => [...c, "DataChannel CLOSE"]);
    pc.onicecandidate = (e) => {
      if (e.candidate) setCandidate(JSON.stringify(e.candidate));
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    setSdp(JSON.stringify(offer));
  };

  // アンサー作成
  const createAnswer = async () => {
    reset();
    setIsOfferer(false);
    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;
    pc.ondatachannel = (e) => {
      channelRef.current = e.channel;
      e.channel.onmessage = (ev) => setChat((c) => [...c, `相手: ${ev.data}`]);
      e.channel.onopen = () => setChat((c) => [...c, "DataChannel OPEN"]);
      e.channel.onclose = () => setChat((c) => [...c, "DataChannel CLOSE"]);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) setCandidate(JSON.stringify(e.candidate));
    };
    try {
      const offer = JSON.parse(remoteSdp);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      setSdp(JSON.stringify(answer));
    } catch (e) {
      alert("SDPが不正です");
    }
  };

  // オファー/アンサーのセット
  const setRemote = async () => {
    try {
      const desc = JSON.parse(remoteSdp);
      await pcRef.current?.setRemoteDescription(desc);
    } catch (e) {
      alert("SDPが不正です");
    }
  };

  // ICE Candidateの追加
  const addCandidate = async () => {
    try {
      const cand = JSON.parse(remoteCandidate);
      await pcRef.current?.addIceCandidate(cand);
    } catch (e) {
      alert("Candidateが不正です");
    }
  };

  // メッセージ送信
  const sendMessage = () => {
    if (channelRef.current && channelRef.current.readyState === "open") {
      channelRef.current.send(message);
      setChat((c) => [...c, `自分: ${message}`]);
      setMessage("");
    }
  };

  return (
    <div className="container">
      <h1>WebRTC サーバーレスチャット</h1>
      <div style={{ marginBottom: 16 }}>
        <button onClick={createOffer}>オファー作成</button>
        <button onClick={createAnswer}>アンサー作成</button>
        <button onClick={reset}>リセット</button>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h2>自分のSDP</h2>
          <textarea value={sdp} readOnly rows={6} style={{ width: "100%" }} />
          <h2>自分のICE Candidate</h2>
          <textarea
            value={candidate}
            readOnly
            rows={3}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h2>相手のSDP</h2>
          <textarea
            value={remoteSdp}
            onChange={(e) => setRemoteSdp(e.target.value)}
            rows={6}
            style={{ width: "100%" }}
          />
          <button
            onClick={setRemote}
            style={{ width: "100%", marginBottom: 8 }}
          >
            SDPセット
          </button>
          <h2>相手のICE Candidate</h2>
          <textarea
            value={remoteCandidate}
            onChange={(e) => setRemoteCandidate(e.target.value)}
            rows={3}
            style={{ width: "100%" }}
          />
          <button onClick={addCandidate} style={{ width: "100%" }}>
            Candidate追加
          </button>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <h2>チャット</h2>
        <div
          style={{
            border: "1px solid #ccc",
            minHeight: 120,
            padding: 8,
            marginBottom: 8,
          }}
        >
          {chat.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="メッセージを入力"
          style={{ width: "80%" }}
        />
        <button onClick={sendMessage} style={{ width: "18%", marginLeft: 8 }}>
          送信
        </button>
      </div>
      <div style={{ marginTop: 32, fontSize: 12, color: "#888" }}>
        <p>1. どちらかが「オファー作成」→SDPをコピペで相手に渡す</p>
        <p>
          2. もう一方が「相手のSDP」に貼り「アンサー作成」→SDPをコピペで返す
        </p>
        <p>3. 最初の人が「相手のSDP」にアンサーを貼り「SDPセット」</p>
        <p>4. ICE Candidateも同様にコピペして「Candidate追加」</p>
        <p>5. DataChannelがOPENしたらチャット可能</p>
      </div>
    </div>
  );
}

export default App;
