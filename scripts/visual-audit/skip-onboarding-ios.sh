#!/bin/bash
#
# Simulator-only helper: marks onboarding complete in the booted iOS
# simulator's AsyncStorage so deep-link captures land on a real screen instead
# of the onboarding gate.
#
# WARNING: this writes into an app container. It is NOT part of a capture run
# and the capture scripts never call it. Run it by hand, only against a
# simulator you are happy to modify, and never against a real device.
#
# Usage: bash scripts/visual-audit/skip-onboarding-ios.sh
set -e
BID=com.ahmed.elhadarey94.khazayinapp
CONTAINER=$(xcrun simctl get_app_container booted "$BID" data)
DIR="$CONTAINER/Library/Application Support/$BID/RCTAsyncLocalStorage_V1"
KEY='@khazain/settings/v1'
HASH=$(printf '%s' "$KEY" | md5)
mkdir -p "$DIR"
printf '%s' '{"state":{"onboardingComplete":true,"onboardingStep":0,"schemaVersion":3},"version":0}' > "$DIR/$HASH"
python3 - "$DIR/manifest.json" "$KEY" <<'PY'
import json,sys,os
path,key=sys.argv[1],sys.argv[2]
m=json.load(open(path)) if os.path.exists(path) else {}
m[key]=None
json.dump(m,open(path,'w'))
PY
echo "onboarding flag written"
