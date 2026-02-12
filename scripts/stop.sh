#!/bin/bash
# Stop AgentBoard backend + frontend

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PID_DIR="$ROOT_DIR/.pids"

# ── Colors & Symbols ──────────────────────────────────────
R='\033[0m'
DIM='\033[2m'
BOLD='\033[1m'
CYAN='\033[38;5;44m'
GREEN='\033[38;5;114m'
RED='\033[38;5;203m'
YELLOW='\033[38;5;221m'
GRAY='\033[38;5;240m'
WHITE='\033[38;5;255m'

OK="${GREEN}✓${R}"
WARN="${YELLOW}~${R}"
FAIL="${RED}✗${R}"
ARROW="${CYAN}→${R}"

# ── Banner ─────────────────────────────────────────────────
echo ""
printf "${DIM}┌─────────────────────────────────────────┐${R}\n"
printf "${DIM}│${R}  ${BOLD}${RED}■${R} ${BOLD}${WHITE}AgentBoard${R}  ${DIM}·${R}  ${DIM}shutting down${R}           ${DIM}│${R}\n"
printf "${DIM}└─────────────────────────────────────────┘${R}\n"
echo ""

# ── Stop function ──────────────────────────────────────────
stop_process() {
  local name=$1
  local port=$2
  local pidfile="$PID_DIR/$name.pid"

  printf "  ${ARROW} ${WHITE}${name}${R}"

  if [ -f "$pidfile" ]; then
    local pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      pkill -P "$pid" 2>/dev/null

      # Wait briefly for graceful shutdown
      local wait=0
      while kill -0 "$pid" 2>/dev/null && [ $wait -lt 10 ]; do
        sleep 0.1
        ((wait++))
      done

      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null
        printf "  ${WARN} ${YELLOW}force killed${R}  ${GRAY}pid ${pid}${R}\n"
      else
        printf "  ${OK} ${GREEN}stopped${R}  ${GRAY}pid ${pid}${R}\n"
      fi
    else
      printf "  ${DIM}not running${R}  ${GRAY}(stale pid)${R}\n"
    fi
    rm -f "$pidfile"
  else
    printf "  ${DIM}no pid file${R}\n"
  fi
}

stop_process "backend" 8000
stop_process "frontend" 3000
echo ""

# ── Fallback: clean ports ─────────────────────────────────
STRAY_8000=$(lsof -ti:8000 2>/dev/null)
STRAY_3000=$(lsof -ti:3000 2>/dev/null)

if [ -n "$STRAY_8000" ] || [ -n "$STRAY_3000" ]; then
  printf "  ${DIM}cleaning stray processes...${R}\n"
  [ -n "$STRAY_8000" ] && echo "$STRAY_8000" | xargs kill 2>/dev/null && printf "    ${OK} ${GRAY}:8000 cleared${R}\n"
  [ -n "$STRAY_3000" ] && echo "$STRAY_3000" | xargs kill 2>/dev/null && printf "    ${OK} ${GRAY}:3000 cleared${R}\n"
  echo ""
fi

# ── Done ───────────────────────────────────────────────────
printf "${DIM}  ─────────────────────────────────────────${R}\n"
printf "  ${GREEN}●${R}  ${DIM}all services stopped${R}\n"
echo ""
