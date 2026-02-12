#!/bin/bash
# Start AgentBoard backend + frontend in background

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PID_DIR="$ROOT_DIR/.pids"
mkdir -p "$PID_DIR"

# ── Colors & Symbols ──────────────────────────────────────
R='\033[0m'        # reset
DIM='\033[2m'
BOLD='\033[1m'
CYAN='\033[38;5;44m'
GREEN='\033[38;5;114m'
YELLOW='\033[38;5;221m'
GRAY='\033[38;5;240m'
WHITE='\033[38;5;255m'
BG='\033[48;5;234m'

OK="${GREEN}✓${R}"
ARROW="${CYAN}→${R}"
SPIN_CHARS='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

spin() {
  local pid=$1 msg=$2
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    local c="${SPIN_CHARS:i%10:1}"
    printf "\r  ${CYAN}${c}${R} ${DIM}${msg}${R}  " >&2
    sleep 0.08
    ((i++))
  done
  printf "\r\033[K" >&2
}

# ── Banner ─────────────────────────────────────────────────
echo ""
printf "${DIM}┌─────────────────────────────────────────┐${R}\n"
printf "${DIM}│${R}  ${BOLD}${CYAN}▲${R} ${BOLD}${WHITE}AgentBoard${R}  ${DIM}·${R}  ${DIM}dev server${R}             ${DIM}│${R}\n"
printf "${DIM}└─────────────────────────────────────────┘${R}\n"
echo ""

# ── Backend ────────────────────────────────────────────────
printf "  ${ARROW} ${WHITE}backend${R}  ${DIM}FastAPI · :8000${R}\n"
cd "$ROOT_DIR/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 > /dev/null 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PID_DIR/backend.pid"
sleep 0.3

if kill -0 "$BACKEND_PID" 2>/dev/null; then
  printf "    ${OK} ${GREEN}running${R}  ${GRAY}pid ${BACKEND_PID}${R}\n"
else
  printf "    ${YELLOW}✗${R} ${YELLOW}failed to start${R}\n"
fi
echo ""

# ── Frontend ───────────────────────────────────────────────
printf "  ${ARROW} ${WHITE}frontend${R}  ${DIM}Vite · :3000${R}\n"
cd "$ROOT_DIR/frontend"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_DIR/frontend.pid"
sleep 0.3

if kill -0 "$FRONTEND_PID" 2>/dev/null; then
  printf "    ${OK} ${GREEN}running${R}  ${GRAY}pid ${FRONTEND_PID}${R}\n"
else
  printf "    ${YELLOW}✗${R} ${YELLOW}failed to start${R}\n"
fi
echo ""

# ── Summary ────────────────────────────────────────────────
printf "${DIM}  ─────────────────────────────────────────${R}\n"
printf "  ${DIM}local${R}    ${WHITE}http://localhost:3000${R}\n"
printf "  ${DIM}api${R}      ${WHITE}http://localhost:8000/api/docs${R}\n"
echo ""
printf "  ${DIM}stop with${R}  ${CYAN}./scripts/stop.sh${R}\n"
echo ""
