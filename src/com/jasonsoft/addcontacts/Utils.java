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

import android.app.AlertDialog;
import android.content.ContentProviderOperation;
import android.content.ContentProviderResult;
import android.content.Context;
import android.content.DialogInterface.OnClickListener;
import android.database.Cursor;
import android.os.Build;
import android.provider.ContactsContract;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.CommonDataKinds.StructuredName;
import android.provider.ContactsContract.Data;
import android.provider.ContactsContract.RawContacts;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.InputStreamReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Utils {

    /**
     * Instances should NOT be constructed in standard programming.
     */
    public Utils() {
        super();
    }

    public static final String JASON_SOFT_ACCOUNT_TYPE = "com.jasonsoft";
    public static final String JASON_SOFT_TEST_ACCOUNT = "test@jasonsoft.com";

    private static final String FIRST_NAME_PATTERN = "(.*<td align=\"center\">)([\\w]+)(</td> <td>[0-9,]+</td> "
            + "<td align=\"center\">)([\\w]+)(</td> <td>[0-9,]+</td></tr>)";
    private static final String SUURNAME_KEYWORD = "(surname|English[ _]surname|disambiguation|name)";
    private static final String SUURNAME_KEYWORD_GROUP = "([_ ]\\(" + SUURNAME_KEYWORD + "\\))?";
    private static final String SURNAME_PATTERN = "(<td><a href=\"/wiki/.+" + SUURNAME_KEYWORD_GROUP
            + "\" title=\"[\\w]+" + SUURNAME_KEYWORD_GROUP  + "\".*>)([\\w]+)(</a></td>)";


    public static ArrayList<String> generateTopFirstnameList(Context context) {
        int[] groupIndexList = new int[] {2, 4};
        return parseAssetsHtmlFile(context, "top_first_name.html", FIRST_NAME_PATTERN, groupIndexList);
    }

    public static ArrayList<String> generateTopSurnameList(Context context) {
        int[] groupIndexList = new int[] {6};
        return parseAssetsHtmlFile(context, "top_surname.html", SURNAME_PATTERN, groupIndexList);
    }

    public static ArrayList<String> parseAssetsHtmlFile(Context context, String fileName, String pattern,
            int[] groupIndexList) {
        ArrayList<String> list = new ArrayList<String>();

        try {
             BufferedReader reader = new BufferedReader(new InputStreamReader(
                        context.getAssets().open(fileName)));
            String line = "";

            while ((line = reader.readLine()) != null) {
                Matcher matcher = Pattern.compile(pattern).matcher(line);
                if (matcher.matches()) {
                    for (int index : groupIndexList) {
                        list.add(matcher.group(index));
                    }
                }
            }
            reader.close();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }

        return list;
    }

    public static String getRandomizedName(Random random, ArrayList<String> topFirstnameList,
            ArrayList<String> topSurnameList) {
        boolean male = random.nextBoolean();
        int firstnameIndex = (male ? 0 : 1) + random.nextInt(100) * 2;
        int surnameIndex = random.nextInt(100);

        return topFirstnameList.get(firstnameIndex) + " " + topSurnameList.get(surnameIndex);
    }

    public static String getRandomizedUSPhoneNumber(Random random, int length) {
        char[] digits = new char[length];
        // US phone number, force to let 1 be the first digit
        digits[0] = '1';
        for (int i = 1; i < length; i++) {
            digits[i] = (char) (random.nextInt(10) + '0');
        }

        return new String(digits);
    }

    public static void insertContactData(Context context, String name, String phoneNumber) {
        // See the raw contact sample code in Google Developer Site
        // http://developer.android.com/reference/android/provider/ContactsContract.RawContacts.html
        ArrayList<ContentProviderOperation> ops = new ArrayList<ContentProviderOperation>();
        int rawContactInsertIndex = ops.size();

        ops.add(ContentProviderOperation.newInsert(RawContacts.CONTENT_URI)
                .withValue(RawContacts.ACCOUNT_TYPE, JASON_SOFT_ACCOUNT_TYPE)
                .withValue(RawContacts.ACCOUNT_NAME, JASON_SOFT_TEST_ACCOUNT)
                .build());
        ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, rawContactInsertIndex)
                .withValue(Data.MIMETYPE,Phone.CONTENT_ITEM_TYPE)
                .withValue(Phone.NUMBER, phoneNumber)
                .build());
        ops.add(ContentProviderOperation.newInsert(Data.CONTENT_URI)
                .withValueBackReference(Data.RAW_CONTACT_ID, rawContactInsertIndex)
                .withValue(Data.MIMETYPE,StructuredName.CONTENT_ITEM_TYPE)
                .withValue(StructuredName.DISPLAY_NAME, name)
                .build());

        try {
            ContentProviderResult[] res = context.getContentResolver().applyBatch(ContactsContract.AUTHORITY, ops);
        } catch (Exception e){
        }
    }

    public static int getJasonRawContactsCounts(Context context) {
        Cursor cursor = context.getContentResolver().query(RawContacts.CONTENT_URI, null,
                RawContacts.ACCOUNT_TYPE + "=? AND " +
                RawContacts.ACCOUNT_NAME + "=? AND " +
                RawContacts.DELETED + "=?",
                new String[] { JASON_SOFT_ACCOUNT_TYPE, JASON_SOFT_TEST_ACCOUNT, "0" },
                RawContacts.DISPLAY_NAME_PRIMARY + " COLLATE LOCALIZED ASC");
        if (cursor != null) {
            return cursor.getCount();
        }

        return 0;
    }

    public static int deleteAllJasonContactsData(Context context) {
        ArrayList<ContentProviderOperation> ops = new ArrayList<ContentProviderOperation>();
        int rawContactInsertIndex = ops.size();

        String selection = RawContacts.ACCOUNT_TYPE + "=? AND " + RawContacts.ACCOUNT_NAME + "=? AND "
                + RawContacts.DELETED + "=?";
        String[] selectionArgs = new String[] { JASON_SOFT_ACCOUNT_TYPE, JASON_SOFT_TEST_ACCOUNT, "0" };
        ops.add(ContentProviderOperation.newDelete(RawContacts.CONTENT_URI)
                .withSelection(selection, selectionArgs)
                .build());

        try {
            ContentProviderResult[] res = context.getContentResolver().applyBatch(ContactsContract.AUTHORITY, ops);
            return res.length;
        } catch (Exception e){
        }

        return 0;
    }
// private void showDialog(int titleId, int messageId, DialogInterface.OnClickListener listener) {
// if (mDialog != null) {
//         mDialog.dismiss();
//         mDialog = null;
//     }
//
//         mDialog = (listener == null) ? CommGuiUtils.createOneButtonDialog(this, titleId, messageId, R.string.ok, null)
//                 : CommGuiUtils.createTwoButtonsDialog(this, titleId, messageId, R.string.yes, R.string.no, listener);
//     mDialog.show();
// }
//
//

    public static void showDeleteConfirmDialog(Context context, OnClickListener listener) {
        AlertDialog dialog = createTwoButtonsDialog(context, R.string.app_name,
                R.string.delete_contacts_confirm, R.string.ok_button, R.string.cancel_button, listener);
        dialog.show();
    }

    public static void showNoContactsAvailableDialog(Context context) {
        AlertDialog dialog = createOneButtonBuilder(context, R.string.app_name,
                R.string.no_contacts_available_to_delete, R.string.ok_button, null).create();
        dialog.show();
    }

    public static AlertDialog createTwoButtonsDialog(Context context, int titleId, int message,
            int positiveButtonTextId, int negativeButtonTextId, OnClickListener listener) {
        return createOneButtonBuilder(context, titleId, message, positiveButtonTextId, listener)
            .setNegativeButton(negativeButtonTextId, null).create();
    }

    public static AlertDialog.Builder createOneButtonBuilder(Context context, int titleId, int messageId,
        int buttonTextId, OnClickListener listener) {
        final AlertDialog.Builder builder = new AlertDialog.Builder(context, AlertDialog.THEME_HOLO_LIGHT);
        builder.setTitle(titleId);
        builder.setMessage(messageId).setPositiveButton(buttonTextId, listener);
        return builder;
    }
}
