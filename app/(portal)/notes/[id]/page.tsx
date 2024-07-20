import React from 'react';
import { PrismaClient } from '@prisma/client';
import dynamic from 'next/dynamic';
import PDFViewer from '@/app/components/pdfviewer';
import { recordViewHistory } from '@/app/actions/viewHistory';
import { auth } from '@/app/auth';
import { TimeHandler } from '@/app/components/forumpost/CommentContainer';
import {notFound} from "next/navigation";
//{dateTimeObj.hours}:{dateTimeObj.minutes} {dateTimeObj.amOrPm}, {dateTimeObj.day}/{dateTimeObj.month}/{dateTimeObj.year}

function removePdfExtension(filename: string): string {
  return filename.endsWith('.pdf') ? filename.slice(0, -4) : filename;
}

function isValidSlot(str: string): boolean {
  const regex = /^[A-G]\d$/;
  return regex.test(str);
}

function isValidYear(year: string): boolean {
  const regex = /^20\d{2}$/;
  return regex.test(year);
}

async function PdfViewerPage({ params }: { params: { id: string } }) {
  const prisma = new PrismaClient();
  let year: string = '';
  let slot: string = '';
  let note;

  try {
    note = await prisma.note.findUnique({
      where: {
        id: params.id
      },
      include: {
        author: true,
        tags: true,
      },
    });

    for(let i : number = 0; i < note!.tags.length; i++) {
        if(isValidYear(note!.tags[i].name)) {
            year = note!.tags[i].name
        }
        else if (isValidSlot(note!.tags[i].name)) {
            slot = note!.tags[i].name
        }
    }

    if (!note) {
      return notFound();
    }
    const session = await auth();
    const userId = session?.user?.id;

    if (userId) {
      await recordViewHistory('note', note.id, userId);
    }
  } catch (error) {
    console.error('Error fetching note:', error);
    return <div className="text-center p-8">Error loading note. Please try again later.</div>;
  } finally {
    await prisma.$disconnect();
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="lg:w-1/2 flex flex-col overflow-hidden">
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">{removePdfExtension(note.title)}</h1>
            <div className="space-y-2 sm:space-y-3">
              <p className="text-base sm:text-lg"><span className="font-semibold">Slot:</span> A1</p>
              <p className="text-base sm:text-lg"><span className="font-semibold">Year:</span> 2024</p>
              <p className="text-base sm:text-lg"><span className="font-semibold">Author:</span> {note.author?.name || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 lg:w-1/2 overflow-hidden lg:border-l lg:border-gray-200 dark:lg:border-gray-700 p-4">
        <div className="h-full overflow-auto">
          <PDFViewer fileUrl={note.fileUrl} />
        </div>
      </div>
    </div>
  );

}

export default dynamic(() => Promise.resolve(PdfViewerPage), { ssr: false });