#!/bin/bash

echo "=== Testing Group Management Service API ==="
echo

echo "1. Testing GET /api/groups (should return empty array initially)"
curl -s http://localhost:5005/api/groups
echo
echo

echo "2. Testing POST /api/groups (create group)"
curl -s -X POST http://localhost:5005/api/groups \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Group","members":[{"fullName":"Member 1","isCoOwner":true}]}'
echo
echo

echo "3. Testing GET /api/groups (should return the created group)"
curl -s http://localhost:5005/api/groups
echo
echo

echo "4. Testing GET /api/groups/1 (get specific group)"
curl -s http://localhost:5005/api/groups/1
echo
echo

echo "5. Testing POST /api/voting/1 (create vote) - using simple string"
curl -s -X POST http://localhost:5005/api/voting/1 \
  -H "Content-Type: application/json" \
  -d '"Test Vote Topic"'
echo
echo

echo "6. Testing POST /api/voting/1/cast (cast vote)"
curl -s -X POST http://localhost:5005/api/voting/1/cast \
  -H "Content-Type: application/json" \
  -d '{"memberId":1,"agree":true}'
echo
echo

echo "7. Testing GET /api/groups/1 (check if vote was recorded)"
curl -s http://localhost:5005/api/groups/1
echo
echo

echo "=== Test completed ==="
