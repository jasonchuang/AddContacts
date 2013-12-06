/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.jasonsoft.addcontacts;

import android.app.ProgressDialog;
import android.os.AsyncTask;
import android.content.Context;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Random;

public class AddContactsAsyncTask extends AsyncTask<Integer, Integer, Integer> {
    private Context mContext;
    private ProgressDialog mDialog;

    public AddContactsAsyncTask(Context context) {
        this.mContext = context;
    }

    protected void onPreExecute() {
        mDialog = new ProgressDialog(mContext);
        mDialog.setMessage(mContext.getString(R.string.adding_contacts));
        mDialog.setCancelable(false);
        mDialog.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL);
        mDialog.show();
    }

    @Override
    protected Integer doInBackground(Integer... params) {
        int contactNumber = params[0];
        Random random = new Random(System.currentTimeMillis());

        ArrayList<String> topFirstnameList = Utils.generateTopFirstnameList(mContext);
        ArrayList<String> topSurnameList = Utils.generateTopSurnameList(mContext);
        int totalContactNumber = 0;

        for (int i = 0; i < contactNumber; i++) {
            String name = Utils.getRandomizedName(random, topFirstnameList, topSurnameList);
            String phoneNumber = Utils.getRandomizedUSPhoneNumber(random, 11);
            Utils.insertContactData(mContext, name, phoneNumber);
            publishProgress((int) ((i / (float) contactNumber) * 100));
            totalContactNumber++;

            // Escape early if cancel() is called
            if (isCancelled()) break;
        }

        return totalContactNumber;
    }

    @Override
    protected void onProgressUpdate(Integer... params) {
        mDialog.setProgress(params[0]);
    }

    @Override
    protected void onPostExecute(Integer result) {
        mDialog.setProgress(100);
        mDialog.dismiss();
        Toast.makeText(mContext, mContext.getString(R.string.adding_contacts_success),
                Toast.LENGTH_SHORT).show();
    }

}
