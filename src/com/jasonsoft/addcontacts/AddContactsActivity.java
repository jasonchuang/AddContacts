/*
 * Copyright (C) 2010 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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

import android.app.Activity;
import android.content.DialogInterface;
import android.content.DialogInterface.OnClickListener;
import android.os.Build;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.Window;
import android.widget.EditText;
import android.widget.Toast;

import java.util.ArrayList;

/**
 */
public class AddContactsActivity extends Activity {

    EditText mContactCountsEdit;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        /**
         * derived classes that use onCreate() overrides must always call the super constructor
         */
        super.onCreate(savedInstanceState);
        getWindow().requestFeature(Window.FEATURE_ACTION_BAR);
        setContentView(R.layout.main);
        mContactCountsEdit = (EditText)findViewById(R.id.contact_counts_edit);
    }

    /**
     * Since onResume() is always called when an Activity is starting, even if it is re-displaying
     * after being hidden, it is the best place to restore state.
     *
     * @see android.app.Activity#onResume()
     */
    @Override
    public void onResume() {
        super.onResume();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.menu_add:
                performAddContactsAction();
                return true;
            case R.id.menu_delete:
                performDeleteContactsAction();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void performAddContactsAction() {
        int contactCounts;
        try {
            contactCounts = Integer.parseInt(mContactCountsEdit.getText().toString());
            if (contactCounts > 1000) {
                Toast.makeText(this, getString(R.string.add_failed_max_count), Toast.LENGTH_SHORT).show();
                return;
            }
        } catch(Exception e) {
            Toast.makeText(this, getString(R.string.add_failed_invalid_format), Toast.LENGTH_SHORT).show();
            return;
        }

        new AddContactsAsyncTask(this).execute(contactCounts);
    }

    private void performDeleteContactsAction() {
        Utils.showDeleteConfirmDialog(this, new OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                new DeleteContactsAsyncTask(AddContactsActivity.this).execute();
            }
        });
    }
}
