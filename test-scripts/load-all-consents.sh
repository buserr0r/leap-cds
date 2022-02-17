#!/bin/bash


for f in $(ls ../test/fixtures/consents/)
do
    node load-fixtures.js $1 $f
done