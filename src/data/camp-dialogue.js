export const CAMP_DIALOGUE = {
  close: [
    {
      id: 'close-route',
      lines: [
        { speaker: 'a', text: '明日は左の通路から調べよう。足場も、こっちの方が安定していた。' },
        { speaker: 'b', text: 'うん。あなたがそう言うなら、迷わずついていける。' },
        { speaker: 'a', text: 'じゃあ決まりだな。見張りが終わったら起こすよ。' }
      ],
      narration: '二人は地面に描いた見取り図を覗き込み、同じ場所を指して笑った。'
    },
    {
      id: 'close-dream',
      lines: [
        { speaker: 'a', text: '帰ったら、川辺の宿で一晩くらいゆっくりしたいな。' },
        { speaker: 'b', text: 'いいね。今度は仕事抜きで、朝まで話そう。' },
        { speaker: 'a', text: '約束だ。忘れたら、今日の失敗談をずっと聞かせる。' }
      ],
      narration: '焚き火の向こうで、二人の笑い声が洞窟の暗がりをやわらげた。'
    },
    {
      id: 'close-thanks',
      lines: [
        { speaker: 'a', text: 'さっきは助かった。あなたが気づいてくれなかったら危なかった。' },
        { speaker: 'b', text: 'お互いさま。あなたの声が聞こえたから、間に合ったんだ。' },
        { speaker: 'a', text: '次も頼りにしてる。もちろん、私にも頼って。' }
      ],
      narration: '片方が差し出した温かい茶を、もう片方は礼を言わずとも受け取った。'
    },
    {
      id: 'close-joke',
      lines: [
        { speaker: 'a', text: 'その干し果実、さっきから一番大きいのを選んでない？' },
        { speaker: 'b', text: '気のせいだよ。……半分いる？' },
        { speaker: 'a', text: 'やっぱり見てたんだ。ありがたくもらうよ。' }
      ],
      narration: 'ブラムは肩をすくめ、エルナは二人のやり取りに目を細めた。'
    }
  ],
  ordinary: [
    {
      id: 'ordinary-route',
      lines: [
        { speaker: 'a', text: '明日は左の通路を先に見よう。足跡が奥へ続いていた。' },
        { speaker: 'b', text: '了解。広間へ出る前に、壁際を確認しておく。' },
        { speaker: 'a', text: '見張りは交代で。夜明け前に起こすよ。' }
      ],
      narration: '相談がまとまると、二人はそれぞれの道具へ手を戻した。'
    },
    {
      id: 'ordinary-gear',
      lines: [
        { speaker: 'a', text: 'その留め具、少し緩んでいる。動く前に締め直した方がいい。' },
        { speaker: 'b', text: '助かる。予備の革紐があるから、すぐ直せそうだ。' },
        { speaker: 'a', text: '終わったら火のそばを空けてくれ。次は私が手入れする。' }
      ],
      narration: '手元の明かりを分け合い、二人は黙々と装備を整えた。'
    },
    {
      id: 'ordinary-watch',
      lines: [
        { speaker: 'a', text: '見張りの順番を決めておこう。最初は誰が起きている？' },
        { speaker: 'b', text: '私が先に行く。次の交代は二時間後でいい。' },
        { speaker: 'a', text: 'わかった。交代の合図は、いつもの三回で。' }
      ],
      narration: '必要な確認だけを済ませると、夜の静けさが戻ってきた。'
    },
    {
      id: 'ordinary-enemies',
      lines: [
        { speaker: 'a', text: 'ゴブリンは正面から押してくる。後ろの一体を見落とさないように。' },
        { speaker: 'b', text: '分かった。足音が重なったら、合図を送る。' },
        { speaker: 'a', text: 'それで十分だ。無理に追いかけず、隊列を保とう。' }
      ],
      narration: '火のそばに石を並べ、二人は通路の幅を確かめた。'
    }
  ],
  distant: [
    {
      id: 'distant-retreat',
      lines: [
        { speaker: 'a', text: '次もあの進み方をするつもりか？　前に出すぎていた。' },
        { speaker: 'b', text: '結果は出た。今は見張りの話をしよう。' },
        { speaker: 'a', text: '……交代は夜半だ。伝えておく。' }
      ],
      narration: '火を挟んで座る距離は近いのに、二人の視線は一度も重ならなかった。'
    },
    {
      id: 'distant-silence',
      lines: [
        { speaker: 'a', text: '包帯を置いておく。必要なら使ってくれ。' },
        { speaker: 'b', text: 'そこに置けばいい。ありがとう。' }
      ],
      narration: '短い返事のあと、二人は別々の場所で食事を済ませ、装備を磨いた。'
    },
    {
      id: 'distant-gear',
      lines: [
        { speaker: 'a', text: 'その音、さっきから気になる。金具を布で巻いてくれ。' },
        { speaker: 'b', text: '分かった。次から気をつける。' },
        { speaker: 'a', text: '……夜番の交代は予定どおりでいい。' }
      ],
      narration: '返事を待たず、{a}は焚き火から離れた岩陰で刃を拭き始めた。'
    },
    {
      id: 'distant-proxy',
      lines: [
        { speaker: 'a', text: '明日の通路のことだが、直接話すのはやめておく。' },
        { speaker: 'b', text: '分かった。伝言なら聞く。' }
      ],
      narration: '見張りの相談は別の仲間を通してまとまり、二人は火を見たまま黙った。'
    }
  ]
};

export const CAMP_COMBAT_MOMENTS = {
  support: {
    close: [
      { id: 'support-close-1', lines: [{ speaker: 'b', text: 'さっきの回復、助かった。痛みが引くまで、あなたの声が聞こえていた。' }, { speaker: 'a', text: '聞こえていたなら十分。次もちゃんと届くように呼ぶよ。' }], narration: '{a}は薬草を片づけ、{b}のそばに温かい水を置いた。' },
      { id: 'support-close-2', lines: [{ speaker: 'b', text: 'あの一撃を受けていたら危なかった。ありがとう。' }, { speaker: 'a', text: '気にしないで。今夜はもう、無理に起きていなくていい。' }], narration: '{a}は見張りを代わり、{b}が横になる場所を整えた。' }
    ],
    ordinary: [
      { id: 'support-ordinary-1', lines: [{ speaker: 'b', text: '手当てをありがとう。明日は動けそうだ。' }, { speaker: 'a', text: 'よかった。包帯はまだあるから、痛んだら言ってくれ。' }], narration: '{b}は礼を言い、{a}は使った薬草の残りを確かめた。' },
      { id: 'support-ordinary-2', lines: [{ speaker: 'b', text: 'さっきの傷、もう大丈夫だ。助かった。' }, { speaker: 'a', text: 'ならよかった。念のため、明日の最初は後ろを歩いてくれ。' }], narration: '二人は傷の具合と明日の隊列を確認してから、食事に戻った。' }
    ],
    distant: [
      { id: 'support-distant-1', lines: [{ speaker: 'b', text: '……さっきは助かった。礼は言っておく。' }, { speaker: 'a', text: '当然のことをしただけだ。傷が開かないように休め。' }], narration: '{b}は目を合わせず、差し出された水だけを受け取った。' },
      { id: 'support-distant-2', lines: [{ speaker: 'b', text: '手当ての分は覚えておく。借りにしておく。' }, { speaker: 'a', text: '借りにしなくていい。明日も同じ隊列で進むんだから。' }], narration: '返事はなく、{b}は焚き火から少し離れて包帯を巻き直した。' }
    ]
  },
  wounded: {
    close: [
      { id: 'wounded-close-1', lines: [{ speaker: 'a', text: '{b}が倒れた時は、心臓が止まるかと思った。次は必ず一緒に帰ろう。' }, { speaker: 'c', text: '交代で見張る。今夜は {b} のそばを離れない。' }], narration: '{a}は安堵したように息を吐き、{b}の毛布を肩まで掛け直した。' }
    ],
    ordinary: [
      { id: 'wounded-ordinary-1', lines: [{ speaker: 'a', text: '{b}の手当ては済んだ。明日は隊列の後ろに置こう。' }, { speaker: 'c', text: 'そうしよう。先を急ぐより、全員で戻ることを優先する。' }], narration: '{a}は水筒と包帯を枕元に置き、{b}の呼吸を確かめた。' }
    ],
    distant: [
      { id: 'wounded-distant-1', lines: [{ speaker: 'a', text: '{b}の手当ては済んだ。夜番は俺が代わる。' }, { speaker: 'c', text: '……分かった。交代の時間になったら声をかける。' }], narration: '{a}は短く指示を出し、{b}から少し離れた場所で見張りについた。' }
    ]
  }
};

export const CAMP_PERSONALITY_BEATS = {
  '慎重': name => `${name}は壁の亀裂と通路の風向きを確かめ、明日の退路を頭の中でなぞった。`,
  '勇敢': name => `${name}は盾を手の届く場所に置き、「次は俺が前を開く」と静かに笑った。`,
  '強気': name => `${name}は明日の敵を相手にするように、指先で空中へ小さく術式を描いた。`,
  '温厚': name => `${name}は湯気の立つカップを仲間へ回し、火が弱まるたびに薪を足した。`,
  '無口': name => `${name}はほとんど口を開かず、聞き役のまま皆のカップに水を注いだ。`,
  '世話好き': name => `${name}は包帯と荷物を順に確かめ、誰の枕元にも水筒を置いて回った。`
};

export const CAMP_PERSONALITY_LINES = {
  '慎重': ['帰り道の目印も、今のうちに決めておこう。', '明日は足場と退路を先に確認したい。'],
  '勇敢': ['次の前衛は任せて。もっと早く道を拓いてみせる。', '危なくなったら、今度も俺が前に立つ。'],
  '強気': ['次はもっと鮮やかに決めてみせるよ。', 'あの程度なら、次は一息で片づけられる。'],
  '温厚': ['みんな、痛むところがあれば今のうちに言ってね。', '焦らなくて大丈夫。順番に休みましょう。'],
  '無口': ['……そうだな。', '分かった。'],
  '世話好き': ['水と包帯は、火のそばにまとめておくね。', '冷える前に、みんなの外套を確かめてくる。']
};
