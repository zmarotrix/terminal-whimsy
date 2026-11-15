// The hidden machine behind the terminal: whimsy@forever.
// Built into term-data.js (scrambled, so View Source doesn't spoil it) by tools/term/build.mjs.
// Paths ending in "/" are directories. Values are file contents, or {c, mode, owner} for special ones.
// SPOILERS for the Seven Seals quest live in this file.

export const MOTD = `WhimsyOS 1.60.1-forever (GNU/Linux 6.9.0-whimsy x86_64)

 * Documentation:  man whimsy
 * Management:     the wisp
 * Support:        an officer, probably

3 packages can be upgraded. 1 wisp is missing its memories.`;

export const MAIL = [
  {
    from: "wisp@forever", subj: "help (please read)", date: "Sat Nov 14 23:58",
    body: `hello. whoever you are.

i'm the wisp. the little green light in the corner. i have a problem:
my memories are locked in a vault, and the vault has seven seals.
i hid the seals around this machine for safekeeping. then i forgot where.
(this is a very wisp thing to do.)

i left notes for myself in ~/notes.org. they made sense when i wrote them.

if you find a seal, speak it to the terminal:  seal <word>
when you have all seven:                       unlock vault

thank you. i'll be in the corner. glowing anxiously.
  -- w`,
  },
  {
    from: "grumbolt@forever", subj: "RE: RE: RE: editors", date: "Thu Nov 12 02:14",
    body: `For the last time: the guild standard is GNU Emacs.
If I catch anyone using vim on this box again I'm revoking their flask privileges.
Also: whoever keeps opening "ed", I can hear you crying.

-- G.
   (sent from M-x message-mode, obviously)`,
  },
  {
    from: "root@forever", subj: "Daily security report", date: "Sun Nov 15 04:00",
    body: `Security report for forever:
  - 1 process (goldbot, pid 4242) is spamming trade chat. Someone kill it.
  - user grumbolt typed a password into his shell again (see his .bash_history).
  - /dev/whimsy is world-readable. This is probably fine.`,
  },
];

const RAIDLOG_TEMPLATES = [
  "<Grumbolt> ok everyone pull timer 10",
  "<Healsbarry> innervate pls",
  "<Tankerbell> taunted. you're welcome",
  "<Critsy> did anyone else see that crit? 4k. FOUR. K.",
  "<Sprinkles> wait which side do we stack",
  "<Fizzlewick> my engineering helm just exploded again",
  "<Saltshaker> loot council is reviewing the situation",
  "<Lootlord> /roll",
  "<Moonbeamz> brb dog",
  "<Shieldon> wall used, can i get a heal",
  "<Dotsworth> soulstone on Healsbarry",
  "<Totemic> windfury down, moving totems",
  "<Pewpewlaser> pet is on the boss, I promise",
  "<Grumbolt> /dbm who even has dbm on forever",
  "<Healsbarry> I'm oom",
  "<Tankerbell> stop pulling threat off me Critsy",
  "<Critsy> it's not my fault salvation is gone",
  "<Mendalot> rez incoming",
  "<Stabigail> going in stealth, don't wait up",
  "<Wobbletoes> my keyboard is a cat now",
  "<Grumbolt> repair before next pull, I'm not paying for it",
  "<Sprinkles> is it raid night yet",
  "<Frostbyte> polymorph on skull... wait which is skull",
  "* Leeroy has gone AFK: chicken",
  "* Wipe. Releasing spirits.",
  "* Grumbolt is rolling on [Breastplate of Glory] (Need)",
];

function raidLog() {
  // deterministic so `grep -n` line numbers stay stable
  let seed = 1609;
  const r = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const lines = [];
  let h = 20, m = 0, s = 0;
  for (let i = 0; i < 420; i++) {
    s += 7 + Math.floor(r() * 40); if (s >= 60) { m += Math.floor(s / 60); s %= 60; } if (m >= 60) { h += 1; m -= 60; }
    const t = `[${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}]`;
    let line = RAIDLOG_TEMPLATES[Math.floor(r() * RAIDLOG_TEMPLATES.length)];
    if (i === 137) line = "<Grumbolt> Healsbarry you are STANDING IN THE FIRE again";
    if (i === 138) line = "<Healsbarry> the fire is warm and I am comfortable";
    if (i === 139) line = "<Grumbolt> you know what, fine, stay in the fire. the first seal of the wisp's vault is EMBER. happy?";
    if (i === 140) line = "<Wisp> !!! please don't say that in raid chat";
    if (i === 301) line = "<Tankerbell> who put a fire totem in the fire";
    lines.push(`${t} ${line}`);
  }
  return lines.join("\n");
}

const rot13 = s => s.replace(/[a-z]/gi, c => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
const b64 = s => Buffer.from(s, "utf8").toString("base64").replace(/(.{60})/g, "$1\n");
const hex = s => [...Buffer.from(s, "utf8")].map(b => b.toString(16).padStart(2, "0")).join(" ");

export function buildFS() {
  return {
    "/": null,
    "/home/": null,
    // ---------------- you ----------------
    "/home/whimsy/": null,
    "/home/whimsy/README": `Welcome to whimsy@forever, the guild's shared box.

Things to try:
  ls -a        (some files are shy)
  mail         (you have some)
  man whimsy   (the manual, such as it is)
  emacs        (Grumbolt insists)

Be nice to the wisp. It lives in /proc/wisp and in the corner of your screen.`,
    "/home/whimsy/.plan": `Plan: find out why the wisp keeps sighing.
Also: the raid log in /var/log remembers everything anyone says in raid.
      Grumbolt shouts about the thing we fear most every single raid.
      If I need to find something, I should grep for it.`,
    "/home/whimsy/.bash_history": "ls\ncd ..\nsudo make me a sandwich\nvim notes.org\n:q\n:wq\n:qa!\nhelp me exit vim\nemacs\nclear\n",
    "/home/whimsy/.profile": `export EDITOR=emacs   # Grumbolt set this. it cannot be changed.
export WISP=awake
alias ll='ls -la'
alias please='sudo'`,
    "/home/whimsy/.emacs.d/": null,
    "/home/whimsy/.emacs.d/init.el": `;;; init.el --- my config, mostly borrowed  -*- lexical-binding: t -*-
;; Grumbolt said his config is "the only correct config".
;; So I load it. Don't tell him I read it.
(load "/home/grumbolt/.emacs.d/init.el")
(setq whimsy-favourite-colour "green")   ; like the wisp`,
    "/home/whimsy/notes.org": `#+TITLE: Wisp's notes (do not lose)
#+AUTHOR: the wisp

* TODO Find my seven seals [0/7]
  When I find one, speak it:  seal <word>
  When I have all seven:      unlock vault

** TODO I.   The raid log remembers what burns.
** TODO II.  Fizzlewick's postcard is hidden twice. Undo both.
** TODO III. Grumbolt's Emacs knows the third, if you let it think.
             (open his init.el in emacs, then M-x eval-buffer)
** TODO IV.  Win the little dungeon game nobody admits to playing.
             (/usr/games. or, in emacs, the classic M-x for text adventures.)
** TODO V.   Someone typed their password where everyone could see.
             Then they went somewhere deep. Follow them.
** TODO VI.  The sixth seal is the dungeon that got slower about coming back.
             Blizzard's own hotfix notes say which. One word, the wet one.
** TODO VII. My memory is in /proc. It isn't written in a language you speak.
             Not yet. (Hex is a language. xxd speaks it.)

* NOTE Things I'm sure about
  - The vault has a door. The door has no handle. Only words.
  - Grumbolt has root. He'd never say the password out loud.
    (He would write it somewhere I'd see it, though.)`,
    "/home/whimsy/inbox/": null,

    // ---------------- grumbolt: officer, emacs evangelist ----------------
    "/home/grumbolt/": null,
    "/home/grumbolt/.plan": `Plan:
  1. Convert the guild to Emacs.
  2. Clear Hyjal Summit.
  3. Stop typing passwords into the wrong window.
Progress: 0/3`,
    "/home/grumbolt/.bash_history": `ls
cd /var/log
grep -c fire raid.log
ssh barrow.deeps
hunter2
clear
# ugh, typed that into the shell instead of the password prompt
history -c
# did that work? it didn't work
emacs`,
    "/home/grumbolt/.emacs.d/": null,
    "/home/grumbolt/.emacs.d/init.el": `;;; init.el --- the only correct config  -*- lexical-binding: t -*-
;; Copyright (C) Grumbolt. All rights reserved. All lefts too.

(setq inhibit-startup-message t)
(setq ring-bell-function 'ignore)            ; the wisp is afraid of the bell
(setq make-backup-files nil)                 ; I live dangerously
(fset 'yes-or-no-p 'y-or-n-p)

(defvar whimsy-guild-motto "Stand in the fire, just a little.")

;; The wisp asked me to keep this safe. I keep things safe by
;; making them slightly annoying to read.
(defvar whimsy--cipher '(120 106 109 109 112 120))

(defun whimsy--third-seal ()
  "Return the third seal. Shifted by one, because I'm clever."
  (concat (mapcar #'1- whimsy--cipher)))

;; Never, ever evaluate (whimsy--third-seal) in front of the guild.
;; Especially not in M-x ielm. Or the *scratch* buffer. Or anywhere.

(provide 'init)
;;; init.el ends here`,
    "/home/grumbolt/todo.txt": `- buy flasks (they persist through death now. finally.)
- write a riddle for the barrow door. make it about flasks. nobody will guess.
- remove vim from the box
- remove nano from the box
- figure out who keeps running 'ed'
- test summon.sh before raid night (it won't run. permissions? who even remembers chmod)`,
    // not executable on purpose: chmod +x it, then ./summon.sh (the terminal rewards running it)
    "/home/grumbolt/summon.sh": { c: `#!/bin/whimsh
# summon.sh: practice for Onyxia, phase two. Do NOT run during a pull.
# usage: ./summon.sh
for whelp in $(seq 1 many); do
  summon whelp --deep-breath
done
echo "MANY WHELPS. HANDLE IT."`, mode: "-rw-r--r--", owner: "grumbolt" },

    // ---------------- fizzlewick: gnome engineer ----------------
    "/home/fizzlewick/": null,
    "/home/fizzlewick/postcard.b64": b64(rot13(`Greetings from Booty Bay!

The weather is lovely, the sharks are friendly, and my goblin jumper cables
only exploded twice. Tell the wisp I kept its second seal safe, written
backwards in time like a proper engineer:

    THE SECOND SEAL IS: TIDE

Burn after reading. (Not literally. Last time I burned something it was the inn.)
-- Fizzlewick`)),
    "/home/fizzlewick/inventions.txt": `INVENTIONS (status)
- Gnomish Mind Control Cap ......... works on chickens only
- Goblin Rocket Boots .............. works, cannot stop
- Discombobulator Ray .............. discombobulated me
- Postcard encoder ................. base64, then rot13. unbreakable!!
- Wisp nightlight .................. the wisp said no`,

    // ---------------- saltshaker: loot council, org-mode fan ----------------
    "/home/saltshaker/": null,
    "/home/saltshaker/todo.org": `#+TITLE: Loot council things
* DONE Argue about the first Breastplate of Glory
* TODO Read Blizzard's hotfix notes before raid
  The Nov 13 hotfix made one dungeon's enemies take twice as long to come back
  (2 hours, was 1). The wisp says that dungeon's name is the sixth seal.
  It's on the site: Changes -> Hotfix log. Search "respawn".
* TODO Stop letting Lootlord roll on cloth`,

    // ---------------- sprinkles: has a ticket ----------------
    "/home/sprinkles/": null,
    "/home/sprinkles/ticket.txt": `+-------------------------------------------+
|        DARKMOON FAIRE  ::  ADMIT ONE       |
|                                            |
|   Fishing! Fortunes! Absolutely no goblins |
|   operating the rides this time.           |
|                                            |
|   Present at the gate:  type  faire        |
+-------------------------------------------+`,
    "/home/sprinkles/diary.txt": `Dear diary,
Today I asked if it was raid night 14 times. It was not raid night.
Tomorrow I will ask 15 times. Growth.`,

    "/home/leeroy/": { c: null, mode: "drwx------", owner: "leeroy" },
    "/home/leeroy/plan.txt": { c: `PLAN
1.
2.
3. (I'll figure it out when I get there)`, mode: "-rw-------", owner: "leeroy" },
    "/home/leeroy/chicken.txt": { c: "At least I have chicken.", mode: "-rw-------", owner: "leeroy" },

    // ---------------- system ----------------
    "/etc/": null,
    "/etc/motd": MOTD,
    "/etc/hostname": "forever",
    "/etc/os-release": `NAME="WhimsyOS"
VERSION="1.60.1 (Forever)"
ID=whimsy
PRETTY_NAME="WhimsyOS 1.60.1 (Forever)"
HOME_URL="https://zmarotrix.github.io/terminal-whimsy/"
SUPPORT_URL="the wisp"
BUG_REPORT_URL="an officer, in guild chat, at 3am"`,
    "/etc/hosts": `127.0.0.1     localhost forever wisp
10.0.7.10     barrow.deeps          # opens 9 Dec. grumbolt has early access somehow
10.0.7.20     hyjal.summit          # opens 9 Dec
10.0.7.40     onyxia.lair           # weekly lockout now
10.0.7.99     darkmoon.faire        # only while the faire is in town
192.0.2.7     goldbot.trade-chat    # please don't`,
    "/etc/passwd": `root:x:0:0:Grumbolt (root):/root:/usr/bin/emacs
whimsy:x:1000:1000:You:/home/whimsy:/bin/whimsh
grumbolt:x:1001:1001:Grumbolt,,Emacs Evangelist:/home/grumbolt:/usr/bin/emacs
fizzlewick:x:1002:1002:Fizzlewick,,Gnome Engineer:/home/fizzlewick:/bin/boom
saltshaker:x:1003:1003:Saltshaker,,Loot Council:/home/saltshaker:/bin/org
sprinkles:x:1004:1004:Sprinkles,,Is It Raid Night:/home/sprinkles:/bin/whimsh
leeroy:x:1005:1005:Leeroy,,AFK (chicken):/home/leeroy:/bin/charge
wisp:x:7:7:the wisp,,daemon:/proc/wisp:/usr/sbin/nologin`,
    "/etc/shells": "/bin/whimsh\n/usr/bin/emacs\n/bin/boom\n/bin/charge\n",
    "/etc/crontab": `# m   h  dom mon dow  command
23 */3  *   *   *    /usr/bin/fetch_news   # The Wire
0   4   *   *   2    /usr/bin/weekly-reset # it's Tuesday somewhere
*/1 *   *   *   *    /usr/sbin/wispd --sparkle`,
    "/etc/fstab": `/dev/wisp0   /         whimsyfs  defaults,whimsy   0 1
/dev/motes   /motes    sparklefs ro                0 0
tmpfs        /tmp      tmpfs     size=7motes       0 0`,
    "/etc/sudoers": { c: null, mode: "-r--r-----", owner: "root" },
    "/var/": null,
    "/var/log/": null,
    "/var/log/raid.log": raidLog(),
    "/var/log/wisp.log": `[  0.000] wispd: starting up (version 1.60.1)
[  0.007] wispd: sparkle subsystem online
[  0.013] wispd: loading memories from /vault ... FAILED (sealed)
[  0.014] wispd: seven seals required. seals found: 0
[  0.020] wispd: attempting to recover the seventh memory from RAM
[  0.021] wispd: memory dump written to /proc/wisp/memory (hex, raw)
[  0.022] wispd: note to self: xxd -r -p turns hex back into words
[  3.141] wispd: user poked the wisp. mood: delighted
[ 60.000] wispd: still sealed. glowing anxiously.`,
    "/var/mail/": null,
    "/proc/": null,
    "/proc/wisp/": null,
    "/proc/wisp/status": `Name:    wispd
State:   S (sleeping lightly)
Pid:     7
Memory:  6 of 7 fragments unreachable
Mood:    hopeful
Sparkle: 100%`,
    "/proc/wisp/memory": hex("starlight") + "\n",
    "/proc/cpuinfo": `processor   : 0
model name  : Arcane Crystal @ 7 motes
cpu MHz     : 1337.000
flags       : fpu whimsy sse2 sparkle no_salvation
bogomips    : 4242.42`,
    "/proc/version": "Linux version 6.9.0-whimsy (grumbolt@forever) (gcc version 14.2 (the wisp)) #1 SMP PREEMPT Tue Nov 4 15:00:00 PST 2026",
    "/dev/": null,
    "/dev/null": "",
    "/dev/whimsy": { c: "*sparkles*", mode: "crw-rw-rw-", owner: "wisp" },
    "/dev/motes": { c: null, mode: "brw-r--r--", owner: "wisp" },
    "/usr/": null,
    "/usr/games/": null,
    "/usr/games/adventure": { c: "#!/bin/whimsh\n# a small dungeon. type: adventure", mode: "-rwxr-xr-x", owner: "root" },
    "/usr/games/fortune": { c: "#!/bin/whimsh\nfortune", mode: "-rwxr-xr-x", owner: "root" },
    "/usr/games/cowsay": { c: "#!/bin/whimsh\ncowsay", mode: "-rwxr-xr-x", owner: "root" },
    "/usr/share/": null,
    "/usr/share/doc/": null,
    "/usr/share/doc/whimsy/": null,
    "/usr/share/doc/whimsy/README": "Docs for WhimsyOS. There's also PATCHNOTES.gz, which is compressed, because the wisp is embarrassed by it. (zcat reads compressed files.)",
    "/usr/share/doc/whimsy/PATCHNOTES.gz": { c: "\x1f\x8b binary, use zcat", mode: "-rw-r--r--", owner: "root" },
    "/srv/": null,
    "/srv/darkmoon/": null,
    "/srv/darkmoon/README": "The Darkmoon Faire's gate opens for ticket holders. Sprinkles had a ticket, last I saw.",
    "/tmp/": null,
    "/tmp/.wisp-was-here": "hi :)",
    "/root/": { c: null, mode: "drwx------", owner: "root" },
    "/root/README.root": { c: `If you're reading this, you have root. Congratulations, or condolences.

There is no eighth seal. There is no ninth seal.
There IS a credits sequence, because every adventure deserves one:  credits

-- G.`, mode: "-r--------", owner: "root" },
    "/root/.emacs": { c: `;; root's config is just grumbolt's config, but angrier.
(setq visible-bell nil)
(setq whimsy-mode t)`, mode: "-r--------", owner: "root" },
  };
}

// barrow.deeps: where Grumbolt went with his leaked password
export const BARROW = {
  "/": null,
  "/welcome.txt": `You are standing in the Barrow Deeps, a prison beneath Hyjal.
It is cold. Somewhere, a druid is snoring very loudly.
There is a great stone door here (door.txt).`,
  "/door.txt": `A great stone door. No handle. Words are carved across it:

    "Bought by the stack, drunk before the pull,
     I no longer quarrel with my elixir cousins,
     and in Forever I do not leave you when you die.
     Speak my name, and I open."

(To speak to the door:  answer <word>)`,
  "/bones.txt": "A pile of bones. A note in them says: 'should have brought a flask.'",
  "/.grumbolt-was-here": "G. was here. Don't tell the guild I got in early.",
};

// the last screen of the adventure (it hands out seal IV)
export const ADV_END = `You climb the last root to the summit of Hyjal. The World Tree hums.

In a hollow of its bark, something small and green is glowing: a scrap of the
wisp's memory, curled up like a sleeping cat. It wakes, blinks at you, and
whispers a single word before drifting home to the corner of your screen:

                          L A N T E R N

The fourth seal is LANTERN.
                                                *** THE END ***
(Type  seal lantern  in the terminal. Your score: 7 of 7 whimsy points.)`;

export const SEALS = ["ember", "tide", "willow", "lantern", "flask", "drowned", "starlight"];
export const ROOT_PASSWORD = "parentheses";
export const SSH_PASSWORD = "hunter2";
