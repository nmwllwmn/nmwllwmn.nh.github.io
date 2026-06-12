const WECHAT_CHATS = {
  mom: {
    title: "妈妈",
    avatar: "妈",
    tone: "family",
    pinned: true,
    time: "置顶",
    readFlag: "readChatMom",
    messages: [
      ["time", "6 月 6 日 17:42"],
      ["other", "最近降温，外套带了吗？"],
      ["me", "带了，晚上走完就回来。"],
      ["other", "别太晚。明天中午之前回个电话，好吗？"],
      ["time", "6 月 7 日 12:06"],
      ["call-missed", "未接微信语音通话"],
      ["other", "电话怎么一直打不通？妈妈有点担心。"]
    ]
  },
  dad: {
    title: "爸爸",
    avatar: "爸",
    tone: "family dad",
    pinned: true,
    time: "置顶",
    readFlag: "readChatDad",
    messages: [
      ["time", "6 月 6 日 17:46"],
      ["other", "你妈说你晚上还要出去？"],
      ["me", "定向赛，走完就回。"],
      ["other", "别老拍那些没人的地方，注意安全。"],
      ["me", "知道。"],
      ["time", "6 月 7 日 11:49"],
      ["call-missed", "未接微信语音通话"],
      ["other", "你手机怎么不接？看到回电话。"]
    ]
  },
  girlfriend: {
    title: "沈眠",
    avatar: "眠",
    tone: "love",
    pinned: true,
    time: "置顶",
    readFlag: "readChatGirlfriend",
    messages: [
      ["time", "5 月 28 日 22:13"],
      ["me", "我校园邮箱密码又忘了。"],
      ["other", "你怎么每次都能忘。"],
      ["me", "找回太麻烦了，要填安全问题，还要等系统邮件。"],
      ["other", "那你就先用<strong>我的密码</strong>，别再拿 0606 到处试。"],
      ["me", "你的？"],
      ["other", "我之前发给你那串。你别又把大小写弄错。"],
      ["me", "好，我记一下。"],
      ["time", "6 月 2 日 09:47"],
      ["other", "邮箱改回来了吗？"],
      ["me", "还没，先这样。"],
      ["other", "别又忘了。"],
      ["time", "6 月 6 日 18:19"],
      ["other", "早点回家休息，踩点结束后。"],
      ["other", "回去后说一声？"],
      ["me", "我只是去确认路线。"],
      ["other", "回去了吗？"],
      ["me", "如果官网说我完赛了，别信。"],
      ["call-in", "微信语音通话 · 已接通 01:42"],
      ["other", "怎么不接电话？？"],
      ["time", "6 月 6 日 23:58"],
      ["call-missed", "未接微信语音通话"]
    ]
  },
  player: {
    title: "阿远",
    avatar: "远",
    tone: "dark",
    time: "昨天",
    readFlag: "readChatPlayer",
    messages: [
      ["time", "6 月 6 日 18:04"],
      ["me", "你明天中午之前如果联系不上我，别先发朋友圈。"],
      ["other", "你又在查什么？"],
      ["me", "0606。"],
      ["me", "城迹社把路线改过一次。"],
      ["other", "什么改过？"],
      ["me", "路线。"],
      ["me", "如果官网说我完赛了，别信。"],
      ["me", "北桥不是终点。"],
      ["me", "18:04 那次同步很怪。历史记录先别动。"],
      ["time", "6 月 6 日 22:17"],
      ["call-out", "微信语音通话 · 未接通"],
      ["other", "我刚才没接到。你现在在哪？"]
    ],
    action: () => {
      setFlag("readLinzhouWechat");
      setStage(8);
    }
  },
  jiang: {
    title: "江予白",
    avatar: "江",
    tone: "blue",
    time: "周日",
    readFlag: "readChatJiang",
    messages: [
      ["time", "6 月 5 日 23:12"],
      ["other", "你昨晚是不是还在看旧路线？"],
      ["me", "嗯，少了一个点。"],
      ["other", "我只拿到过导出的表，后台不是我进的。"],
      ["me", "那是谁导入的 S05-S07？"],
      ["other", "表里有个批次号，IMP 开头。我不敢再查了。"]
    ],
    action: () => setFlag("foundImportBatchHint")
  },
  team: {
    title: "夜航03小队(4)",
    listTitle: "夜航03小队",
    avatar: "队",
    tone: "orange",
    time: "周六",
    readFlag: "readChatTeam",
    group: true,
    messages: [
      ["time", "6 月 6 日 20:55"],
      ["chen", "我退赛了。西桥那边太暗。"],
      ["jiang", "林舟呢？他刚刚说还要去拍一张照片。"],
      ["me", "我去确认最后一个点。你们先回。"],
      ["time", "6 月 7 日 00:12"],
      ["chen", "有人联系上林舟吗？"],
      ["yuan", "我打了微信语音，没接。"],
      ["jiang", "后面的照片不像他拍的。导入时间也不对。"],
      ["chen", "别在群里说了。"]
    ],
    action: () => setFlag("readTeamDoubt")
  }
};

const WECHAT_AVATAR_MAP = {
  chen: "檐",
  jiang: "江",
  yuan: "远"
};

const WECHAT_NAME_MAP = {
  chen: "陈檐",
  jiang: "江予白",
  yuan: "阿远"
};

function getWechatPreview(chat) {
  const last = [...chat.messages].reverse().find(([type]) => type !== "time" && type !== "system");
  if (!last) return "";
  const [type, text] = last;
  if (chat.group && WECHAT_NAME_MAP[type]) return `${WECHAT_NAME_MAP[type]}：${text}`;
  return text;
}
